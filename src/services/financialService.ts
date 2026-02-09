import { supabase } from '../lib/supabase';
import type { EventExpense, EventCommission, EventFiscalDetails } from '../types/financials';

export const financialService = {
  // Expenses
  async getExpenses(eventId: string): Promise<EventExpense[]> {
    const { data, error } = await supabase
      .from('event_expenses' as any)
      .select('*')
      .eq('event_id', eventId)
      .order('date', { ascending: true });

    if (error) throw error;
    return (data || []) as any;
  },

  async saveExpense(expense: Partial<EventExpense> & { event_id: string }): Promise<void> {
    const { error } = await supabase
      .from('event_expenses' as any)
      .upsert(expense as any);

    if (error) throw error;
  },

  async deleteExpense(id: string): Promise<void> {
    const { error } = await supabase
      .from('event_expenses' as any)
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Commissions
  async getCommissions(eventId: string): Promise<EventCommission[]> {
    const { data, error } = await supabase
      .from('event_commissions' as any)
      .select('*')
      .eq('event_id', eventId);

    if (error) throw error;
    return (data || []) as any;
  },

  async saveCommission(commission: Partial<EventCommission> & { event_id: string }): Promise<void> {
    const { error } = await supabase
      .from('event_commissions' as any)
      .upsert(commission as any);

    if (error) throw error;
  },

  // Fiscal Details
  async getFiscalDetails(eventId: string): Promise<EventFiscalDetails | null> {
    const { data, error } = await supabase
      .from('event_fiscal_details' as any)
      .select('*')
      .eq('event_id', eventId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return (data || null) as any;
  },

  async saveFiscalDetails(details: Partial<EventFiscalDetails> & { event_id: string }): Promise<void> {
    const { error } = await supabase
      .from('event_fiscal_details' as any)
      .upsert(details as any);

    if (error) throw error;
  }
};
