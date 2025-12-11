import { supabase } from '../lib/supabase';
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

  updateQuoteStatus: async (id: string, status: Quote['status']): Promise<Quote | undefined> => {
    const { data, error } = await supabase
      .from('quotes')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapToQuote(data);
  },

  createQuote: async (quote: Omit<Quote, 'id' | 'created_at' | 'updated_at'>): Promise<Quote> => {
    const dbQuote: QuoteInsert = {
      client_id: quote.client_id,
      event_id: quote.event_id,
      items: quote.items as unknown as Database['public']['Tables']['quotes']['Insert']['items'],
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
    return mapToQuote(data);
  },

  updateQuote: async (id: string, quote: Partial<Quote>): Promise<Quote> => {
    const dbQuote: QuoteUpdate = {
      client_id: quote.client_id,
      event_id: quote.event_id,
      items: quote.items ? (quote.items as unknown as Database['public']['Tables']['quotes']['Update']['items']) : undefined,
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

  deleteQuote: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
