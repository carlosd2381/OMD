import { supabase } from '../lib/supabase';
import type { EventExpense, EventCommission, EventFiscalDetails } from '../types/financials';

type UntypedSupabaseClient = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

const untypedSupabase = supabase as unknown as UntypedSupabaseClient;

export const financialService = {
  // Expenses
  async getExpenses(eventId: string): Promise<EventExpense[]> {
    const { data, error } = await untypedSupabase
      .from('event_expenses')
      .select('*')
      .eq('event_id', eventId)
      .order('date', { ascending: true });

    if (error) throw error;
    return (data || []) as unknown as EventExpense[];
  },

  async saveExpense(expense: Partial<EventExpense> & { event_id: string }): Promise<void> {
    const { error } = await untypedSupabase
      .from('event_expenses')
      .upsert(expense as unknown as Record<string, unknown>);

    if (error) throw error;
  },

  async deleteExpense(id: string): Promise<void> {
    const { error } = await untypedSupabase
      .from('event_expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Commissions
  async getCommissions(eventId: string): Promise<EventCommission[]> {
    const { data, error } = await untypedSupabase
      .from('event_commissions')
      .select('*')
      .eq('event_id', eventId);

    if (error) throw error;
    return (data || []) as unknown as EventCommission[];
  },

  async saveCommission(commission: Partial<EventCommission> & { event_id: string }): Promise<void> {
    const { error } = await untypedSupabase
      .from('event_commissions')
      .upsert(commission as unknown as Record<string, unknown>);

    if (error) throw error;
  },

  // Fiscal Details
  async getFiscalDetails(eventId: string): Promise<EventFiscalDetails | null> {
    const { data, error } = await untypedSupabase
      .from('event_fiscal_details')
      .select('*')
      .eq('event_id', eventId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    return (data || null) as EventFiscalDetails | null;
  },

  async saveFiscalDetails(details: Partial<EventFiscalDetails> & { event_id: string }): Promise<void> {
    const { error } = await untypedSupabase
      .from('event_fiscal_details')
      .upsert(details as unknown as Record<string, unknown>);

    if (error) throw error;
  }
};
