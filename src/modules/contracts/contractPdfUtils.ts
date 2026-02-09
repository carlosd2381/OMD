import { CONTRACT_HEADER_HTML } from '../../constants/contractTemplate';
import { tokenService } from '../../services/tokenService';
import type { Client } from '../../types/client';
import type { Contract } from '../../types/contract';
import type { Event } from '../../types/event';
import type { Invoice } from '../../types/invoice';
import type { Planner } from '../../types/planner';
import type { Quote } from '../../types/quote';
import type { Venue } from '../../types/venue';
import type {
  ContractContentBlock,
  ContractInvoiceScheduleItem,
  ContractTextSegment,
} from './ContractPDF';

const htmlEntityMap: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&ldquo;': '"',
  '&rdquo;': '"',
  '&lsquo;': "'",
  '&rsquo;': "'",
  '&mdash;': '—',
  '&ndash;': '–',
};

export interface ContractHydrationContext {
  client: Client | null;
  event: Event | null;
  venue: Venue | null;
  planner: Planner | null;
  quote?: Quote | null;
  invoices?: Invoice[];
}

export function parseContractContentBlocks(html: string): ContractContentBlock[] {
  if (!html) return [];
  let sanitized = html;
  sanitized = sanitized.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  Object.entries(htmlEntityMap).forEach(([entity, replacement]) => {
    const regex = new RegExp(entity, 'gi');
    sanitized = sanitized.replace(regex, replacement);
  });

  if (typeof DOMParser === 'undefined') {
    return sanitized
      .replace(/<br\s*\/?>(?:\s*)?/gi, '\n')
      .replace(/<\/(p|div|h[1-6])>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .split(/\n{2,}/)
      .map(text => text.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .map(text => ({ type: 'paragraph', text }));
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${sanitized}</div>`, 'text/html');
  const container = doc.body;
  const blocks: ContractContentBlock[] = [];
  const termsRegex = /terms\s*(?:and|&)?\s*conditions/i;
  const hasExplicitTerms = termsRegex.test(container.textContent || '');
  let capturingBlocks = !hasExplicitTerms;

  const pushBlock = (block: ContractContentBlock) => {
    if (!capturingBlocks) {
      if (block.type === 'heading' && /terms\s*(?:and|&)?\s*conditions/i.test(block.text)) {
        capturingBlocks = true;
      }
      return;
    }
    blocks.push(block);
  };

  type SegmentStyle = Pick<ContractTextSegment, 'bold' | 'italic' | 'underline'>;

  const collectSegments = (
    element: Element,
    inherited?: SegmentStyle
  ): ContractTextSegment[] => {
    const segments: ContractTextSegment[] = [];
    const walk = (node: ChildNode, active?: SegmentStyle) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const normalized = (node.textContent ?? '').replace(/\s+/g, ' ');
        const trimmed = normalized.trim();
        if (trimmed) {
          segments.push({
            text: trimmed,
            bold: active?.bold,
            italic: active?.italic,
            underline: active?.underline,
          });
        }
        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as HTMLElement;
      const nextActive: SegmentStyle = { ...(active || {}) };
      const tag = el.tagName.toLowerCase();
      if (tag === 'strong' || tag === 'b') nextActive.bold = true;
      if (tag === 'em' || tag === 'i') nextActive.italic = true;
      if (tag === 'u') nextActive.underline = true;
      const fontWeight = el.style?.fontWeight;
      if (fontWeight && fontWeight !== 'normal' && Number(fontWeight) >= 500) nextActive.bold = true;
      if (el.style?.fontStyle === 'italic') nextActive.italic = true;
      if (el.style?.textDecoration?.includes('underline')) nextActive.underline = true;
      Array.from(el.childNodes).forEach(child => walk(child, nextActive));
    };

    Array.from(element.childNodes).forEach(child => walk(child, inherited));
    return segments;
  };

  const walkNodes = (node: ChildNode) => {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      const raw = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (raw) {
        pushBlock({ type: 'paragraph', text: raw });
      }
      return;
    }

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    switch (tag) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6': {
        const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
        if (text) {
          pushBlock({ type: 'heading', level: Number(tag.replace('h', '')) || 3, text });
        }
        break;
      }
      case 'p': {
        const segments = collectSegments(el);
        if (segments.length === 1 && !segments[0].bold && !segments[0].italic && !segments[0].underline) {
          const text = segments[0].text.trim();
          if (text) pushBlock({ type: 'paragraph', text });
        } else if (segments.length > 0) {
          pushBlock({ type: 'rich', segments });
        }
        break;
      }
      case 'div': {
        if (el.children.length === 0) {
          const segments = collectSegments(el);
          if (segments.length === 1 && !segments[0].bold && !segments[0].italic && !segments[0].underline) {
            const text = segments[0].text.trim();
            if (text) pushBlock({ type: 'paragraph', text });
          } else if (segments.length > 0) {
            pushBlock({ type: 'rich', segments });
          }
        } else {
          Array.from(el.childNodes).forEach(walkNodes);
        }
        break;
      }
      case 'ul':
      case 'ol': {
        const ordered = tag === 'ol';
        const items = Array.from(el.children)
          .map(child => child.textContent?.replace(/\s+/g, ' ').trim())
          .filter((text): text is string => Boolean(text));
        if (items.length > 0) {
          pushBlock({ type: 'list', ordered, items });
        }
        break;
      }
      case 'br':
        pushBlock({ type: 'paragraph', text: '' });
        break;
      default:
        Array.from(el.childNodes).forEach(walkNodes);
    }
  };

  Array.from(container.childNodes).forEach(walkNodes);
  return blocks.filter(block => {
    if (block.type === 'list') return block.items.length > 0;
    if (block.type === 'rich') return block.segments.length > 0;
    return Boolean((block as any).text?.trim());
  });
}

export function hydrateContractContent(contract: Contract, context: ContractHydrationContext): string {
  if (!contract.content) return '';
  let content = contract.content;
  content = content.replace(
    'Invoice schedule will be generated upon booking.',
    '{{invoice_schedule}}'
  );

  const termsIndex = content.search(/Terms and Conditions/i);
  if (termsIndex !== -1) {
    const termsContent = content.substring(termsIndex);
    content = `${CONTRACT_HEADER_HTML}
      <div style="margin-bottom: 40px;">
        <p style="font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">Service Details</p>
        {{quote_line_items}}
      </div>

      <div style="margin-bottom: 40px;">
        <p style="font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">Payment Schedule</p>
        {{invoice_schedule}}
      </div>
      <div style="margin-bottom: 40px;">
        ${termsContent}
      </div>
    `;
  }

  content = tokenService.replaceTokens(content, {
    client: context.client || undefined,
    event: context.event || undefined,
    venue: context.venue || undefined,
    planner: context.planner || undefined,
    quote: context.quote || undefined,
    invoices: context.invoices,
  });

  content = content.replace(
    /<div style="width: 120px; height: 120px;.*?<\/div>/s,
    ''
  );
  content = content.replace(/^LOGO\s*/i, '');
  content = content.replace(/<p>LOGO<\/p>/i, '');

  return content;
}

interface ScheduleBuilderArgs {
  invoices: Invoice[];
  quote?: Quote | null;
  event?: Event | null;
}

export function buildContractInvoiceSchedule({ invoices, quote, event }: ScheduleBuilderArgs): ContractInvoiceScheduleItem[] {
  if (invoices && invoices.length > 0) {
    return [...invoices]
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
      .map(invoice => ({
        label: invoice.items[0]?.description || invoice.invoice_number,
        dueDateLabel: invoice.due_date
          ? new Date(invoice.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
          : 'Due on issue',
        amount: invoice.total_amount,
        status: invoice.status,
      }));
  }

  if (!quote) return [];

  const safeRate = quote.exchange_rate && quote.exchange_rate > 0 ? quote.exchange_rate : 1;
  const baseTotal = quote.currency === 'MXN' ? quote.total_amount : quote.total_amount * safeRate;
  const retainer = baseTotal * 0.35;
  const balance = baseTotal - retainer;
  let balanceDueLabel = '10 days prior to event';
  if (event?.date) {
    const dueDate = new Date(event.date);
    dueDate.setDate(dueDate.getDate() - 10);
    balanceDueLabel = dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  return [
    {
      label: 'Retainer (35%)',
      dueDateLabel: 'Upon Booking',
      amount: retainer,
      status: 'pending',
    },
    {
      label: 'Balance (65%)',
      dueDateLabel: balanceDueLabel,
      amount: balance,
      status: 'pending',
    },
  ];
}
