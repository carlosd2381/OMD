import { supabase } from '../lib/supabase';
import { activityLogService } from './activityLogService';
import type {
  CreateFinancialTransactionInput,
  FinancialTransaction,
  InvoiceTrackingRow,
} from '../types/financialModule';

type UntypedSupabaseClient = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

const untypedSupabase = supabase as unknown as UntypedSupabaseClient;

type InvoiceBaseRow = {
  id: string;
  invoice_number?: string | null;
  client_id: string;
  event_id?: string | null;
  total_amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  due_date: string;
  created_at: string;
  type: 'retainer' | 'installment' | 'final_balance' | 'standard' | 'change_order';
};

type ClientNameRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
};

type EventNameRow = {
  id: string;
  name?: string | null;
};

type ReceivedPaymentRow = {
  invoice_id: string;
  amount: number;
  status: 'pending' | 'cleared' | 'failed' | 'cancelled';
};

export type InvoiceStatusSyncResult = {
  invoiceId: string;
  previousStatus: InvoiceBaseRow['status'];
  nextStatus: InvoiceBaseRow['status'];
  changed: boolean;
};

export type CreateTransactionResult = {
  invoiceStatusSync?: InvoiceStatusSyncResult;
};

export type InvoiceAutoUpdateAudit = {
  invoiceId: string;
  previousStatus: InvoiceBaseRow['status'];
  nextStatus: InvoiceBaseRow['status'];
  createdAt: string;
};

export const financialModuleService = {
  async getInvoiceTrackingRows(): Promise<InvoiceTrackingRow[]> {
    const { data: invoiceData, error: invoiceError } = await untypedSupabase
      .from('invoices')
      .select('id, invoice_number, client_id, event_id, total_amount, status, due_date, created_at, type')
      .order('due_date', { ascending: true });

    if (invoiceError) throw invoiceError;

    const invoices = ((invoiceData || []) as unknown as InvoiceBaseRow[]).filter((row) => row.client_id);
    if (invoices.length === 0) return [];

    const clientIds = Array.from(new Set(invoices.map((invoice) => invoice.client_id)));
    const eventIds = Array.from(new Set(invoices.map((invoice) => invoice.event_id).filter(Boolean))) as string[];
    const invoiceIds = invoices.map((invoice) => invoice.id);

    const [{ data: clientRows, error: clientError }, { data: eventRows, error: eventError }, { data: paymentRows, error: paymentError }] = await Promise.all([
      untypedSupabase.from('clients').select('id, first_name, last_name').in('id', clientIds),
      eventIds.length > 0 ? untypedSupabase.from('events').select('id, name').in('id', eventIds) : Promise.resolve({ data: [], error: null }),
      untypedSupabase
        .from('financial_transactions')
        .select('invoice_id, amount, status')
        .eq('direction', 'received')
        .in('invoice_id', invoiceIds),
    ]);

    if (clientError) throw clientError;
    if (eventError) throw eventError;
    if (paymentError && !String((paymentError as { message?: string }).message || '').includes('financial_transactions')) {
      throw paymentError;
    }

    const clientMap = new Map((clientRows as unknown as ClientNameRow[]).map((client) => {
      const fullName = [client.first_name, client.last_name].filter(Boolean).join(' ').trim();
      return [client.id, fullName || 'Unknown Client'];
    }));

    const eventMap = new Map((eventRows as unknown as EventNameRow[]).map((event) => [event.id, event.name || 'Untitled Event']));

    const receivedByInvoice = new Map<string, number>();
    for (const payment of ((paymentRows || []) as unknown as ReceivedPaymentRow[])) {
      if (!payment.invoice_id || payment.status !== 'cleared') continue;
      const current = receivedByInvoice.get(payment.invoice_id) || 0;
      receivedByInvoice.set(payment.invoice_id, current + (payment.amount || 0));
    }

    const today = new Date();

    return invoices.map((invoice) => {
      const amountReceived = receivedByInvoice.get(invoice.id) || 0;
      const amountOutstanding = Math.max(0, (invoice.total_amount || 0) - amountReceived);
      const dueDate = new Date(invoice.due_date);
      const isOverdue = amountOutstanding > 0 && dueDate.getTime() < today.getTime() && invoice.status !== 'cancelled';

      return {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        client_id: invoice.client_id,
        client_name: clientMap.get(invoice.client_id) || 'Unknown Client',
        event_id: invoice.event_id,
        event_name: invoice.event_id ? eventMap.get(invoice.event_id) || null : null,
        total_amount: invoice.total_amount || 0,
        amount_received: amountReceived,
        amount_outstanding: amountOutstanding,
        status: invoice.status,
        due_date: invoice.due_date,
        created_at: invoice.created_at,
        type: invoice.type || 'standard',
        is_overdue: isOverdue,
      };
    });
  },

  async getTransactions(): Promise<FinancialTransaction[]> {
    const { data, error } = await untypedSupabase
      .from('financial_transactions')
      .select('*')
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      const message = String((error as { message?: string }).message || '');
      if (message.includes('financial_transactions')) return [];
      throw error;
    }

    return (data || []) as unknown as FinancialTransaction[];
  },

  async getLatestInvoiceAutoUpdateMap(invoiceIds: string[]): Promise<Record<string, InvoiceAutoUpdateAudit | null>> {
    if (invoiceIds.length === 0) return {};

    const detailsFilter = invoiceIds
      .map((invoiceId) => `details.ilike.%invoice_id:${invoiceId}%`)
      .join(',');

    const { data, error } = await untypedSupabase
      .from('activity_logs')
      .select('details, created_at')
      .eq('entity_type', 'client')
      .eq('action', 'Invoice Status Auto-Updated')
      .or(detailsFilter)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const result: Record<string, InvoiceAutoUpdateAudit | null> = Object.fromEntries(
      invoiceIds.map((invoiceId) => [invoiceId, null])
    );

    const unresolved = new Set(invoiceIds);
    for (const row of (data || []) as Array<{ details?: string | null; created_at?: string | null }>) {
      if (unresolved.size === 0) break;

      const details = row.details || '';
      const invoiceIdMatch = details.match(/invoice_id:([a-f0-9-]{36})/i);
      const fromMatch = details.match(/from:([a-z_]+)/i);
      const toMatch = details.match(/to:([a-z_]+)/i);

      const invoiceId = invoiceIdMatch?.[1];
      if (!invoiceId || !unresolved.has(invoiceId)) continue;

      const previousStatus = (fromMatch?.[1] || 'sent') as InvoiceBaseRow['status'];
      const nextStatus = (toMatch?.[1] || 'sent') as InvoiceBaseRow['status'];

      result[invoiceId] = {
        invoiceId,
        previousStatus,
        nextStatus,
        createdAt: row.created_at || new Date().toISOString(),
      };
      unresolved.delete(invoiceId);
    }

    return result;
  },

  async createTransaction(input: CreateFinancialTransactionInput): Promise<CreateTransactionResult> {
    const payload = {
      direction: input.direction,
      amount: input.amount,
      currency: input.currency,
      transaction_date: input.transaction_date,
      payment_method: input.payment_method || null,
      reference: input.reference || null,
      notes: input.notes || null,
      invoice_id: input.invoice_id || null,
      event_id: input.event_id || null,
      client_id: input.client_id || null,
      status: input.status || 'cleared',
    };

    const { error } = await untypedSupabase
      .from('financial_transactions')
      .insert(payload as unknown as Record<string, unknown>);

    if (error) throw error;

    if (input.direction === 'received' && (input.status || 'cleared') === 'cleared' && input.invoice_id) {
      const invoiceStatusSync = await syncInvoiceStatusFromPayments(input.invoice_id);
      return { invoiceStatusSync };
    }

    return {};
  },
};

async function syncInvoiceStatusFromPayments(invoiceId: string): Promise<InvoiceStatusSyncResult> {
  const [{ data: invoiceRow, error: invoiceError }, { data: paymentRows, error: paymentError }] = await Promise.all([
    untypedSupabase
      .from('invoices')
      .select('id, client_id, total_amount, status, due_date')
      .eq('id', invoiceId)
      .maybeSingle(),
    untypedSupabase
      .from('financial_transactions')
      .select('amount, status')
      .eq('direction', 'received')
      .eq('invoice_id', invoiceId),
  ]);

  if (invoiceError) throw invoiceError;
  if (paymentError) throw paymentError;
  if (!invoiceRow) {
    return {
      invoiceId,
      previousStatus: 'sent',
      nextStatus: 'sent',
      changed: false,
    };
  }

  const receivedCleared = ((paymentRows || []) as unknown as ReceivedPaymentRow[])
    .filter((row) => row.status === 'cleared')
    .reduce((sum, row) => sum + (row.amount || 0), 0);

  const totalAmount = Number((invoiceRow as { total_amount?: number }).total_amount || 0);
  const outstanding = Math.max(0, totalAmount - receivedCleared);

  const previousStatus: InvoiceBaseRow['status'] = (invoiceRow as InvoiceBaseRow).status;
  let nextStatus: InvoiceBaseRow['status'] = previousStatus;
  if (nextStatus === 'cancelled') {
    return {
      invoiceId,
      previousStatus,
      nextStatus,
      changed: false,
    };
  }

  if (outstanding <= 0) {
    nextStatus = 'paid';
  } else {
    const dueDate = new Date((invoiceRow as { due_date: string }).due_date);
    const today = new Date();
    nextStatus = dueDate.getTime() < today.getTime() ? 'overdue' : 'sent';
  }

  if (nextStatus !== previousStatus) {
    const { error: updateError } = await untypedSupabase
      .from('invoices')
      .update({ status: nextStatus } as unknown as Record<string, unknown>)
      .eq('id', invoiceId);

    if (updateError) throw updateError;

    const invoiceClientId = (invoiceRow as { client_id?: string }).client_id;
    if (invoiceClientId) {
      await activityLogService.logActivity({
        entity_id: invoiceClientId,
        entity_type: 'client',
        action: 'Invoice Status Auto-Updated',
        details: `invoice_id:${invoiceId} from:${previousStatus} to:${nextStatus}`,
      });
    }

    return {
      invoiceId,
      previousStatus,
      nextStatus,
      changed: true,
    };
  }

  return {
    invoiceId,
    previousStatus,
    nextStatus,
    changed: false,
  };
}
