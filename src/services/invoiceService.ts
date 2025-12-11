import { supabase } from '../lib/supabase';
import type { Invoice } from '../types/invoice';

export const invoiceService = {
  getInvoicesByClient: async (clientId: string): Promise<Invoice[]> => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(mapToInvoice);
  },

  updateStatus: async (id: string, status: Invoice['status']): Promise<Invoice | null> => {
    const { data, error } = await supabase
      .from('invoices')
      .update({
        status,
        // updated_at: new Date().toISOString() // TODO: Add updated_at column to DB
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return null;

    return mapToInvoice(data);
  }
};

// Helper to map DB result to Invoice type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapToInvoice(data: any): Invoice {
  return {
    ...data,
    items: data.items as Invoice['items'], // Cast JSON to items array
    updated_at: data.created_at // Fallback
  };
}
