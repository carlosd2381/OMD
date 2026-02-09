import { clientService } from './clientService';
import { eventService } from './eventService';
import { settingsService, type BrandingSettings, type EmailSettings, type FinancialSettings } from './settingsService';
import type { Quote } from '../types/quote';
import type { Contract } from '../types/contract';
import type { Invoice } from '../types/invoice';
import type { Client } from '../types/client';
import type { Event } from '../types/event';
import { formatCurrency } from '../utils/formatters';

const DEFAULT_BRAND_NAME = 'Oh My Desserts MX';
const DEFAULT_NOTIFICATIONS_API = 'http://localhost:3001';
const NOTIFICATION_BASE_URL = (import.meta.env.VITE_NOTIFICATIONS_API_URL || DEFAULT_NOTIFICATIONS_API).replace(/\/$/, '');
const EMAIL_ENDPOINT = `${NOTIFICATION_BASE_URL}/notifications/email`;
const CLIENT_PORTAL_URL = import.meta.env.VITE_CLIENT_PORTAL_URL?.trim();
const CACHE_WINDOW = 5 * 60 * 1000; // 5 minutes

type NotificationEventKey = 'quoteSent' | 'contractSigned' | 'invoicePaid';

type NotificationPreferences = Record<string, { email?: boolean } | undefined> | null;

interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface DetailRow {
  label: string;
  value?: string | null;
}

interface EmailTemplateOptions {
  greeting: string;
  intro: string;
  detailRows?: DetailRow[];
  closing: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footer?: string;
}

interface SmtpConfig {
  host?: string;
  port?: number | string;
  username?: string;
  password?: string;
  secure?: boolean;
}

let cachedEmailSettings: EmailSettings | null = null;
let cachedBranding: BrandingSettings | null = null;
let cachedFinancial: FinancialSettings | null = null;
let emailSettingsFetchedAt = 0;
let brandingFetchedAt = 0;
let financialFetchedAt = 0;

const shouldRefresh = (timestamp: number) => !timestamp || Date.now() - timestamp > CACHE_WINDOW;

const loadEmailSettings = async (): Promise<EmailSettings | null> => {
  if (cachedEmailSettings && !shouldRefresh(emailSettingsFetchedAt)) {
    return cachedEmailSettings;
  }
  cachedEmailSettings = await settingsService.getEmailSettings();
  emailSettingsFetchedAt = Date.now();
  return cachedEmailSettings;
};

const loadBranding = async (): Promise<BrandingSettings | null> => {
  if (cachedBranding && !shouldRefresh(brandingFetchedAt)) {
    return cachedBranding;
  }
  cachedBranding = await settingsService.getBrandingSettings();
  brandingFetchedAt = Date.now();
  return cachedBranding;
};

const loadFinancialSettings = async (): Promise<FinancialSettings | null> => {
  if (cachedFinancial && !shouldRefresh(financialFetchedAt)) {
    return cachedFinancial;
  }
  cachedFinancial = await settingsService.getFinancialSettings();
  financialFetchedAt = Date.now();
  return cachedFinancial;
};

const shouldSendEmail = (settings: EmailSettings | null, event: NotificationEventKey) => {
  if (!settings) return false;
  const preferences = settings.notifications as NotificationPreferences;
  if (!preferences) return true;
  const eventPrefs = preferences[event];
  if (eventPrefs && typeof eventPrefs.email === 'boolean') {
    return eventPrefs.email;
  }
  return true;
};

const compactDetails = (rows: Array<DetailRow | null | undefined>): DetailRow[] => rows.filter(Boolean) as DetailRow[];

const buildEmailTemplate = ({ greeting, intro, detailRows = [], closing, ctaLabel, ctaUrl, footer }: EmailTemplateOptions) => {
  const sanitizedRows = detailRows.filter((row) => row?.value);
  const detailSection = sanitizedRows.length
    ? `<div style="margin:16px 0;">
        ${sanitizedRows
          .map((row) => `<p style="margin:4px 0;"><strong>${row.label}:</strong> ${row.value}</p>`)
          .join('')}
      </div>`
    : '';

  const ctaSection = ctaLabel && ctaUrl
    ? `<p style="margin:24px 0;">
        <a href="${ctaUrl}" style="background-color:#111827;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
          ${ctaLabel}
        </a>
      </p>`
    : '';

  const footerSection = footer
    ? `<p style="color:#6b7280;font-size:12px;margin-top:24px;">${footer}</p>`
    : '';

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;line-height:1.6;">
      <p style="margin:0 0 12px;">${greeting}</p>
      <p style="margin:0 0 12px;">${intro}</p>
      ${detailSection}
      ${ctaSection}
      <p style="margin:24px 0 0;">${closing}</p>
      ${footerSection}
    </div>
  `;
};

const applySignature = (html: string, signature?: string | null) => {
  if (!signature) return html;
  return `${html}<br/><br/>${signature}`;
};

const safeFormatDate = (value?: string | null) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
};

const formatClientName = (client: Client | null) => {
  if (!client) return 'there';
  const parts = [client.first_name, client.last_name].filter(Boolean);
  return parts.length ? parts.join(' ') : 'there';
};

const safeGetClient = async (clientId: string): Promise<Client | null> => {
  try {
    return await clientService.getClient(clientId);
  } catch (error) {
    console.error('Unable to load client for email notification', error);
    return null;
  }
};

const safeGetEvent = async (eventId: string | null | undefined): Promise<Event | null> => {
  if (!eventId) return null;
  try {
    return await eventService.getEvent(eventId);
  } catch (error) {
    console.error('Unable to load event for email notification', error);
    return null;
  }
};

const getBrandName = (branding: BrandingSettings | null) => branding?.company_name || DEFAULT_BRAND_NAME;

const postEmail = async (message: EmailMessage, settings: EmailSettings) => {
  const smtpConfig = (settings.smtp_config || {}) as SmtpConfig;
  if (!smtpConfig.host || !smtpConfig.username || !smtpConfig.password) {
    throw new Error('SMTP settings are incomplete.');
  }

  const response = await fetch(EMAIL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      smtpConfig,
      sender: settings.sender_identity || {},
      message: {
        ...message,
        html: applySignature(message.html, settings.signature)
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || 'Failed to send email notification.');
  }
};

const buildQuoteDetails = (quote: Quote, event: Event | null): DetailRow[] => {
  const rows: Array<DetailRow | null> = [
    { label: 'Quote Total', value: formatCurrency(quote.total_amount, quote.currency) },
    event?.name ? { label: 'Event', value: event.name } : null,
    event?.date ? { label: 'Event Date', value: safeFormatDate(event.date) } : null,
    quote.valid_until ? { label: 'Valid Until', value: safeFormatDate(quote.valid_until) } : null
  ];
  return compactDetails(rows);
};

const buildContractDetails = (contract: Contract, event: Event | null): DetailRow[] => {
  const rows: Array<DetailRow | null> = [
    event?.name ? { label: 'Event', value: event.name } : null,
    event?.date ? { label: 'Event Date', value: safeFormatDate(event.date) } : null,
    { label: 'Status', value: contract.status.toUpperCase() },
    contract.signed_at ? { label: 'Signed On', value: safeFormatDate(contract.signed_at) } : null
  ];
  return compactDetails(rows);
};

const buildInvoiceDetails = (invoice: Invoice, currency: string, event: Event | null): DetailRow[] => {
  const rows: Array<DetailRow | null> = [
    { label: 'Invoice #', value: invoice.invoice_number },
    { label: 'Amount', value: formatCurrency(invoice.total_amount, currency) },
    invoice.paid_at ? { label: 'Paid On', value: safeFormatDate(invoice.paid_at) } : null,
    invoice.due_date ? { label: 'Due Date', value: safeFormatDate(invoice.due_date) } : null,
    event?.name ? { label: 'Event', value: event.name } : null
  ];
  return compactDetails(rows);
};

export const emailNotificationService = {
  async sendQuoteSentNotification(quote: Quote) {
    const [settings, branding] = await Promise.all([loadEmailSettings(), loadBranding()]);
    if (!shouldSendEmail(settings, 'quoteSent')) return;

    const client = await safeGetClient(quote.client_id);
    if (!client?.email || !settings) return;

    const event = await safeGetEvent(quote.event_id);
    const brandName = getBrandName(branding);

    const html = buildEmailTemplate({
      greeting: `Hi ${formatClientName(client)},`,
      intro: event?.name
        ? `Your quote for ${event.name} is ready to review.`
        : 'Your quote is ready to review.',
      detailRows: buildQuoteDetails(quote, event),
      ctaLabel: CLIENT_PORTAL_URL ? 'View Quote' : undefined,
      ctaUrl: CLIENT_PORTAL_URL,
      closing: `Warmly,<br/>${brandName}`,
      footer: 'You can reply directly to this email with any questions.'
    });

    await postEmail({
      to: client.email,
      subject: `${brandName} • Your quote is ready`,
      html,
      text: `Your quote total is ${formatCurrency(quote.total_amount, quote.currency)}.`
    }, settings);
  },

  async sendContractSignedNotification(contract: Contract) {
    const [settings, branding] = await Promise.all([loadEmailSettings(), loadBranding()]);
    if (!shouldSendEmail(settings, 'contractSigned')) return;

    const client = await safeGetClient(contract.client_id);
    if (!client?.email || !settings) return;

    const event = await safeGetEvent(contract.event_id);
    const brandName = getBrandName(branding);

    const html = buildEmailTemplate({
      greeting: `Hi ${formatClientName(client)},`,
      intro: event?.name
        ? `We received your signed contract for ${event.name}.`
        : 'We received your signed contract.',
      detailRows: buildContractDetails(contract, event),
      ctaLabel: CLIENT_PORTAL_URL ? 'Review Contract' : undefined,
      ctaUrl: CLIENT_PORTAL_URL,
      closing: `Thank you for choosing ${brandName}!<br/>Our team will be in touch with next steps.`,
      footer: 'Need changes? Just reply to this email.'
    });

    await postEmail({
      to: client.email,
      subject: `${brandName} • Contract confirmed`,
      html,
      text: 'We received your signed contract. We will follow up shortly with next steps.'
    }, settings);
  },

  async sendInvoicePaidNotification(invoice: Invoice) {
    const [settings, branding, financial] = await Promise.all([
      loadEmailSettings(),
      loadBranding(),
      loadFinancialSettings()
    ]);
    if (!shouldSendEmail(settings, 'invoicePaid')) return;

    const client = await safeGetClient(invoice.client_id);
    if (!client?.email || !settings) return;

    const event = await safeGetEvent(invoice.event_id);
    const brandName = getBrandName(branding);
    const currency = financial?.currency || 'MXN';
    const normalizedInvoice = invoice.paid_at ? invoice : { ...invoice, paid_at: new Date().toISOString() };
    const amountDisplay = formatCurrency(invoice.total_amount, currency);

    const html = buildEmailTemplate({
      greeting: `Hi ${formatClientName(client)},`,
      intro: `We received your payment for invoice ${invoice.invoice_number}.`,
      detailRows: buildInvoiceDetails(normalizedInvoice, currency, event),
      ctaLabel: CLIENT_PORTAL_URL ? 'View Invoice' : undefined,
      ctaUrl: CLIENT_PORTAL_URL,
      closing: `Thank you for trusting ${brandName}.`,
      footer: 'This payment receipt was generated automatically.'
    });

    await postEmail({
      to: client.email,
      subject: `${brandName} • Payment received`,
      html,
      text: `Payment of ${amountDisplay} received for invoice ${invoice.invoice_number}.`
    }, settings);
  }
};
