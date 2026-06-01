import { supabase } from '../lib/supabase';
import { activityLogService, formatNotificationActivityDetails } from './activityLogService';
import { formatCurrency } from '../utils/formatters';
import { emailNotificationService } from './emailNotificationService';
import type { Quote, QuoteItem, QuoteTax } from '../types/quote';
import type { Database } from '../types/supabase';

type QuoteRow = Database['public']['Tables']['quotes']['Row'];
type QuoteInsert = Database['public']['Tables']['quotes']['Insert'];
type QuoteUpdate = Database['public']['Tables']['quotes']['Update'];

function mapToQuote(row: QuoteRow): Quote {
  return {
    id: row.id,
    client_id: row.client_id,
    event_id: row.event_id,
    parent_quote_id: row.parent_quote_id || undefined,
    version: row.version || 1,
    items: (row.items as unknown as QuoteItem[]) || [],
    taxes: (row.taxes as unknown as QuoteTax[]) || undefined,
    currency: row.currency,
    exchange_rate: row.exchange_rate,
    total_amount: row.total_amount,
    questionnaire_template_id: row.questionnaire_template_id || undefined,
    contract_template_id: row.contract_template_id || undefined,
    payment_plan_template_id: row.payment_plan_template_id || undefined,
    status: row.status,
    valid_until: row.valid_until,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.created_at || new Date().toISOString(), // Using created_at as fallback since updated_at is not in the table definition yet
  };
}

export const quoteService = {
  getQuotesByClient: async (clientId: string): Promise<Quote[]> => {
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapToQuote);
  },

  getQuotesByEvent: async (eventId: string): Promise<Quote[]> => {
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapToQuote);
  },

  getQuote: async (id: string): Promise<Quote | undefined> => {
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return undefined;
    return mapToQuote(data);
  },

  updateQuoteStatus: async (
    id: string,
    status: Quote['status'],
    options?: { sendNotification?: boolean }
  ): Promise<Quote | undefined> => {
    const previousQuote = await quoteService.getQuote(id);

    const { data, error } = await supabase
      .from('quotes')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    const updatedQuote = mapToQuote(data);
    
    await activityLogService.logActivity({
      entity_id: updatedQuote.client_id,
      entity_type: 'client',
      action: 'Quote Status Updated',
      details: `Quote status updated to ${status}`,
    });

    if (status === 'accepted' && previousQuote?.status !== 'accepted') {
      await activityLogService.logActivity({
        entity_id: updatedQuote.client_id,
        entity_type: 'client',
        action: 'Quote Accepted',
        details: `Quote ${updatedQuote.id} accepted by client`,
      });
    }

    const logNotificationActivity = async (action: string, details: string) => {
      try {
        await activityLogService.logActivity({
          entity_id: updatedQuote.client_id,
          entity_type: 'client',
          action,
          details: formatNotificationActivityDetails(details, 'quote', updatedQuote.id),
        });
      } catch (logError) {
        console.error('Failed to write quote notification activity log:', logError);
      }
    };

    const shouldNotifyQuoteSent =
      status === 'sent' &&
      previousQuote?.status !== 'sent' &&
      options?.sendNotification !== false;

    if (shouldNotifyQuoteSent) {
      try {
        await emailNotificationService.sendQuoteSentNotification(updatedQuote);
        await logNotificationActivity('Quote Notification Sent', `Quote sent email delivered for quote ${updatedQuote.id}`);
      } catch (notificationError) {
        console.error('Failed to send quote notification email:', notificationError);
        await logNotificationActivity('Quote Notification Failed', `Quote sent email failed for quote ${updatedQuote.id}`);
      }
    } else if (status === 'sent') {
      await logNotificationActivity('Quote Notification Skipped', `Quote sent email skipped for quote ${updatedQuote.id} (already sent or suppressed)`);
    }

    return updatedQuote;
  },

  createQuote: async (quote: Omit<Quote, 'id' | 'created_at' | 'updated_at'>): Promise<Quote> => {
    const dbQuote: QuoteInsert = {
      client_id: quote.client_id,
      event_id: quote.event_id,
      parent_quote_id: quote.parent_quote_id,
      version: quote.version,
      items: quote.items as unknown as Database['public']['Tables']['quotes']['Insert']['items'],
      taxes: quote.taxes as unknown as Database['public']['Tables']['quotes']['Insert']['taxes'],
      currency: quote.currency,
      exchange_rate: quote.exchange_rate,
      total_amount: quote.total_amount,
      questionnaire_template_id: quote.questionnaire_template_id,
      contract_template_id: quote.contract_template_id,
      payment_plan_template_id: quote.payment_plan_template_id,
      status: quote.status,
      valid_until: quote.valid_until,
    };

    const { data, error } = await supabase
      .from('quotes')
      .insert(dbQuote)
      .select()
      .single();

    if (error) throw error;

    await activityLogService.logActivity({
      entity_id: quote.client_id,
      entity_type: 'client',
      action: 'Quote Created',
      details: `Quote created for ${formatCurrency(quote.total_amount, quote.currency)}`,
    });

    return mapToQuote(data);
  },

  updateQuote: async (id: string, quote: Partial<Quote>): Promise<Quote> => {
    const dbQuote: QuoteUpdate = {
      client_id: quote.client_id,
      event_id: quote.event_id,
      parent_quote_id: quote.parent_quote_id,
      version: quote.version,
      items: quote.items ? (quote.items as unknown as Database['public']['Tables']['quotes']['Update']['items']) : undefined,
      taxes: quote.taxes !== undefined
        ? (quote.taxes as unknown as Database['public']['Tables']['quotes']['Update']['taxes'])
        : undefined,
      currency: quote.currency,
      exchange_rate: quote.exchange_rate,
      total_amount: quote.total_amount,
      questionnaire_template_id: quote.questionnaire_template_id,
      contract_template_id: quote.contract_template_id,
      payment_plan_template_id: quote.payment_plan_template_id,
      status: quote.status,
      valid_until: quote.valid_until,
    };

    const { data, error } = await supabase
      .from('quotes')
      .update(dbQuote)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapToQuote(data);
  },

  createQuoteRevision: async (
    originalQuoteId: string,
    quote: Omit<Quote, 'id' | 'created_at' | 'updated_at' | 'parent_quote_id' | 'version'>
  ): Promise<Quote> => {
    const originalQuote = await quoteService.getQuote(originalQuoteId);
    if (!originalQuote) {
      throw new Error('Original quote not found for revision');
    }

    const revisedQuote = await quoteService.createQuote({
      ...quote,
      parent_quote_id: originalQuote.id,
      version: (originalQuote.version || 1) + 1,
    });

    await quoteService.updateQuote(originalQuote.id, { status: 'rejected' });

    await activityLogService.logActivity({
      entity_id: revisedQuote.client_id,
      entity_type: 'client',
      action: 'Quote Revision Created',
      details: `Quote revision v${revisedQuote.version} created from quote ${originalQuote.id}`,
    });

    return revisedQuote;
  },

  deleteQuote: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
