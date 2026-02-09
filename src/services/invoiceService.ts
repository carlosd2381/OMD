import { supabase } from '../lib/supabase';
import { activityLogService } from './activityLogService';
import { emailNotificationService } from './emailNotificationService';
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

  getInvoicesByEvent: async (eventId: string): Promise<Invoice[]> => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('event_id', eventId)
      .order('due_date', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapToInvoice);
  },

  getInvoicesByQuote: async (quoteId: string): Promise<Invoice[]> => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('quote_id', quoteId)
      .order('due_date', { ascending: true });

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

    const updatedInvoice = mapToInvoice(data);

    await activityLogService.logActivity({
      entity_id: updatedInvoice.client_id,
      entity_type: 'client',
      action: 'Invoice Status Updated',
      details: `Invoice status updated to ${status}`,
    });

    if (status === 'paid') {
      try {
        await emailNotificationService.sendInvoicePaidNotification(updatedInvoice);
      } catch (notificationError) {
        console.error('Failed to send invoice notification email:', notificationError);
      }
    }

    return updatedInvoice;
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
