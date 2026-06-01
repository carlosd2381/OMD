import { supabase } from '../lib/supabase';
import { formatDocumentID } from './formatters';

type LegacyQuoteSourceOptions = {
  invoiceId?: string;
};

export type QuoteSourceContext = {
  isLegacyInvoiceSource: boolean;
  sourceInvoiceId: string | null;
};

export function buildQuotePathFromLegacyInvoice(quoteId: string, options?: LegacyQuoteSourceOptions): string {
  const params = new URLSearchParams({ source: 'legacy-invoice' });

  if (options?.invoiceId) {
    params.set('invoiceId', options.invoiceId);
  }

  return `/quotes/${quoteId}?${params.toString()}`;
}

export function parseQuoteSourceContext(search: string): QuoteSourceContext {
  const params = new URLSearchParams(search);
  const isLegacyInvoiceSource = params.get('source') === 'legacy-invoice';
  const sourceInvoiceId = params.get('invoiceId');

  return {
    isLegacyInvoiceSource,
    sourceInvoiceId,
  };
}

export async function resolveQuoteSourceInvoiceLabel(sourceInvoiceId: string, eventDate?: string): Promise<string> {
  try {
    const { data } = await supabase
      .from('invoices')
      .select('id, created_at')
      .eq('id', sourceInvoiceId)
      .maybeSingle();

    if (data?.created_at) {
      return formatDocumentID('INV', eventDate || data.created_at);
    }
  } catch {
    // fallback below
  }

  return sourceInvoiceId;
}
