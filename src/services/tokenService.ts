import { SYSTEM_TOKENS } from '../constants/tokens';
import type { Client } from '../types/client';
import type { Event } from '../types/event';
import type { Quote } from '../types/quote';
import type { Venue } from '../types/venue';
import type { Planner } from '../types/planner';
import type { Invoice } from '../types/invoice';
import { formatCurrency } from '../utils/formatters';

interface TokenContext {
  client?: Client;
  event?: Event;
  venue?: Venue;
  planner?: Planner;
  quote?: Quote;
  invoices?: Invoice[];
  // Add other entities as needed
}

export const tokenService = {
  replaceTokens: (content: string, context: TokenContext): string => {
    let result = content;

    // 1. Replace System Tokens
    SYSTEM_TOKENS.forEach(token => {
      const escapedLabel = token.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`{{${token.key}}}|\\[${escapedLabel}\\]`, 'g');
      let value = '';

      switch (token.category) {
        case 'Client':
          if (context.client) {
            if (token.key === 'client_first_name') value = context.client.first_name;
            else if (token.key === 'client_last_name') value = context.client.last_name;
            else if (token.key === 'client_email') value = context.client.email;
            else if (token.key === 'client_phone') value = context.client.phone || '';
            else if (token.key === 'client_address') {
               // Fallback: If address is empty, try to construct it from other fields or check if it's in a different field
               value = context.client.address || '';
               if (!value && context.client.city) {
                 value = `${context.client.city}, ${context.client.state || ''} ${context.client.zip_code || ''}`;
               }
            }
            else if (token.key === 'client_city_state_zip') {
              // If address contains commas, it might already include city/state/zip
              // But if we have structured data, use it.
              const parts = [context.client.city, context.client.state, context.client.zip_code].filter(Boolean);
              value = parts.length > 0 ? parts.join(', ') : '';
            }
            // ... map other client fields
          }
          break;

        case 'Event':
          if (context.event) {
            if (token.key === 'event_name') value = context.event.name;
            else if (token.key === 'event_date') {
              // Format date as "Month Day, Year" (e.g. July 17, 2026)
              const dateObj = new Date(context.event.date);
              // Adjust for timezone offset to prevent off-by-one error if date is UTC
              const userTimezoneOffset = dateObj.getTimezoneOffset() * 60000;
              const adjustedDate = new Date(dateObj.getTime() + userTimezoneOffset);
              value = adjustedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            }
            else if (token.key === 'event_type') value = context.event.type || '';
            else if (token.key === 'guest_count') value = context.event.guest_count?.toString() || '';
            // Fallback for venue fields if they are on the event object
            else if (token.key === 'venue_name' && !value) value = context.event.venue_name || '';
            else if (token.key === 'venue_address' && !value) value = context.event.venue_address || '';
          }
          break;

        case 'Venue':
          if (context.event) {
            if (token.key === 'venue_name') value = context.event.venue_name || (context.venue?.name || '');
            else if (token.key === 'venue_sub_location') value = context.event.venue_sub_location || '';
            else if (token.key === 'venue_address') value = context.event.venue_address || (context.venue?.address || '');
            else if (token.key === 'venue_location') value = context.event.venue_address || (context.venue?.address || '');
          } else if (context.venue) {
            if (token.key === 'venue_name') value = context.venue.name;
            else if (token.key === 'venue_address') value = context.venue.address;
          }
          break;

        case 'Planner':
          if (context.event) {
            if (token.key === 'planner_company') value = context.event.planner_company || (context.planner?.company || '');
            else if (token.key === 'planner_name') value = `${context.event.planner_first_name || context.planner?.first_name || ''} ${context.event.planner_last_name || context.planner?.last_name || ''}`.trim();
            else if (token.key === 'planner_phone') value = context.event.planner_phone || (context.planner?.phone || '');
            else if (token.key === 'planner_email') value = context.event.planner_email || (context.planner?.email || '');
            else if (token.key === 'planner_instagram') value = context.event.planner_instagram || (context.planner?.instagram || '');
          }
          break;

        case 'Timeline':
          if (context.event) {
            if (token.key === 'time_start' || token.key === 'event_start_time') {
              // Format time if it's in HH:mm:ss format
              const time = context.event.start_time || '';
              value = time.length > 5 ? time.substring(0, 5) : time;
            }
            else if (token.key === 'time_end' || token.key === 'event_end_time') {
              const time = context.event.end_time || '';
              value = time.length > 5 ? time.substring(0, 5) : time;
            }
            else if (token.key === 'time_setup') value = context.event.setup_time || '';
            else if (token.key === 'time_arrive') value = context.event.arrive_venue_time || '';
          }
          break;

        case 'Financial':
          if (context.quote) {
            if (token.key === 'quote_line_items') {
              value = generateQuoteLineItemsTable(context.quote);
            } else if (token.key === 'invoice_schedule') {
              value = generateInvoiceScheduleTable({
                quote: context.quote,
                invoices: context.invoices,
                event: context.event
              });
            } else if (token.key === 'invoice_total') {
              value = context.quote.total_amount.toLocaleString('en-US', { style: 'currency', currency: context.quote.currency });
            }
          }
          break;
          
        // ... handle other categories
      }

      result = result.replace(pattern, value || `[${token.label}]`);
    });

    return result;
  }
};

function generateQuoteLineItemsTable(quote: Quote): string {
  if (!quote.items || quote.items.length === 0) return '';

  const formatNumber = (amount: number) => amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const formatQuantity = (qty: number) => Number.isInteger(qty)
    ? qty.toString()
    : qty.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatMoney = (amount: number) => formatCurrency(amount, 'MXN');

  const lineRows = quote.items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.description}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatQuantity(item.quantity)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatNumber(item.unit_price)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatNumber(item.total)}</td>
    </tr>
  `).join('');

  const subtotal = quote.items.reduce((sum, item) => sum + item.total, 0);
  const taxes = quote.taxes || [];
  const netTaxes = taxes.reduce((sum, tax) => sum + (tax.is_retention ? -tax.amount : tax.amount), 0);
  const grandTotal = subtotal + netTaxes;

  const taxRows = taxes.map(tax => {
    const amount = tax.is_retention ? -tax.amount : tax.amount;
    const rateLabel = typeof tax.rate === 'number' ? ` (${tax.rate}%)` : '';
    return `
      <tr>
        <td style="padding: 6px 8px;">${tax.name}${rateLabel}</td>
        <td style="padding: 6px 8px; text-align: right;">${formatMoney(amount)}</td>
      </tr>
    `;
  }).join('');

  return `
    <table style="width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 14px;">
      <thead>
        <tr style="background-color: #f3f4f6;">
          <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Description</th>
          <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ddd;">Qty</th>
          <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
          <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${lineRows}
      </tbody>
    </table>
    <div style="display: flex; justify-content: flex-end; margin-top: 12px;">
      <table style="border-collapse: collapse; font-family: sans-serif; font-size: 13px; min-width: 260px;">
        <tbody>
          <tr>
            <td style="padding: 6px 8px; color: #4b5563;">Subtotal</td>
            <td style="padding: 6px 8px; text-align: right; font-weight: 500;">${formatMoney(subtotal)}</td>
          </tr>
          ${taxRows}
          <tr>
            <td style="padding: 8px; border-top: 1px solid #d1d5db; font-weight: 600;">Grand Total</td>
            <td style="padding: 8px; border-top: 1px solid #d1d5db; text-align: right; font-weight: 600;">${formatMoney(grandTotal)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function generateInvoiceScheduleTable(params: { quote?: Quote; invoices?: Invoice[]; event?: Event }): string {
  const { quote, invoices, event } = params;
  const currency = quote?.currency || 'MXN';

  if (invoices && invoices.length > 0) {
    const sorted = [...invoices].sort((a, b) => {
      const aTime = a.due_date ? new Date(a.due_date).getTime() : 0;
      const bTime = b.due_date ? new Date(b.due_date).getTime() : 0;
      return aTime - bTime;
    });

    const rows = sorted.map(invoice => {
      const description = invoice.items && invoice.items.length > 0
        ? invoice.items[0].description
        : invoice.invoice_number;
      const dueDate = invoice.due_date
        ? new Date(invoice.due_date).toLocaleDateString()
        : 'Due on issue';
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${description}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${dueDate}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(invoice.total_amount, 'MXN')}</td>
        </tr>
      `;
    }).join('');

    return `
      <table style="width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 14px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Payment</th>
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Due Date</th>
            <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ddd;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  if (!quote) return '';

  const safeRate = quote.exchange_rate && quote.exchange_rate > 0
    ? quote.exchange_rate
    : 1;
  const totalBaseAmount = quote.currency === 'MXN'
    ? quote.total_amount
    : quote.total_amount * safeRate;
  const retainer = totalBaseAmount * 0.35;
  const balance = totalBaseAmount * 0.65;

  let balanceDueDate = '10 days prior to event';
  if (event?.date) {
    const date = new Date(event.date);
    date.setDate(date.getDate() - 10);
    balanceDueDate = date.toLocaleDateString();
  }

  return `
    <table style="width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 14px;">
      <thead>
        <tr style="background-color: #f3f4f6;">
          <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Payment</th>
          <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Due Date</th>
          <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ddd;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">Retainer (35%)</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">Upon Booking</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(retainer, currency)}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">Balance (65%)</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${balanceDueDate}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(balance, currency)}</td>
        </tr>
      </tbody>
    </table>
  `;
}
