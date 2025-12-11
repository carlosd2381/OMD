import { SYSTEM_TOKENS } from '../constants/tokens';
import type { Client } from '../types/client';
import type { Event } from '../types/event';
import type { Quote, QuoteItem } from '../types/quote';
import type { Venue } from '../types/venue';
import type { Planner } from '../types/planner';

interface TokenContext {
  client?: Client;
  event?: Event;
  venue?: Venue;
  planner?: Planner;
  quote?: Quote;
  // Add other entities as needed
}

export const tokenService = {
  replaceTokens: (content: string, context: TokenContext): string => {
    let result = content;

    // 1. Replace System Tokens
    SYSTEM_TOKENS.forEach(token => {
      const pattern = new RegExp(`{{${token.key}}}`, 'g');
      let value = '';

      switch (token.category) {
        case 'Client':
          if (context.client) {
            if (token.key === 'client_first_name') value = context.client.first_name;
            else if (token.key === 'client_last_name') value = context.client.last_name;
            else if (token.key === 'client_email') value = context.client.email;
            else if (token.key === 'client_phone') value = context.client.phone || '';
            else if (token.key === 'client_address') value = context.client.address || '';
            // ... map other client fields
          }
          break;

        case 'Event':
          if (context.event) {
            if (token.key === 'event_name') value = context.event.name;
            else if (token.key === 'event_date') value = new Date(context.event.date).toLocaleDateString();
            else if (token.key === 'event_type') value = context.event.type || '';
            else if (token.key === 'guest_count') value = context.event.guest_count?.toString() || '';
            // ... map other event fields
          }
          break;

        case 'Financial':
          if (context.quote) {
            if (token.key === 'quote_line_items') {
              value = generateQuoteLineItemsTable(context.quote.items);
            } else if (token.key === 'invoice_schedule') {
              // This would ideally come from a real invoice schedule, 
              // but for now we can generate it based on the quote total and a standard schedule
              // or if we had the invoices passed in context.
              // For now, let's just show "Invoice Schedule Placeholder" or similar if data missing
              value = "<i>Invoice schedule will be generated upon booking.</i>";
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

function generateQuoteLineItemsTable(items: QuoteItem[]): string {
  if (!items || items.length === 0) return '';

  const rows = items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.description}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
    </tr>
  `).join('');

  return `
    <table style="width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 14px;">
      <thead>
        <tr style="background-color: #f3f4f6;">
          <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Item</th>
          <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Description</th>
          <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ddd;">Qty</th>
          <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
          <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}
