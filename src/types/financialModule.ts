export type FinancialTransactionDirection = 'received' | 'sent';

export type FinancialTransactionStatus = 'pending' | 'cleared' | 'failed' | 'cancelled';

export interface FinancialTransaction {
  id: string;
  direction: FinancialTransactionDirection;
  status: FinancialTransactionStatus;
  amount: number;
  currency: 'MXN' | 'USD' | 'CAD' | 'EUR' | 'GBP';
  transaction_date: string;
  payment_method?: string | null;
  reference?: string | null;
  notes?: string | null;
  invoice_id?: string | null;
  event_id?: string | null;
  client_id?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface CreateFinancialTransactionInput {
  direction: FinancialTransactionDirection;
  amount: number;
  currency: FinancialTransaction['currency'];
  transaction_date: string;
  payment_method?: string;
  reference?: string;
  notes?: string;
  invoice_id?: string;
  event_id?: string;
  client_id?: string;
  status?: FinancialTransactionStatus;
}

export interface InvoiceTrackingRow {
  id: string;
  invoice_number?: string | null;
  client_id: string;
  client_name: string;
  event_id?: string | null;
  event_name?: string | null;
  total_amount: number;
  amount_received: number;
  amount_outstanding: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  due_date: string;
  created_at: string;
  type: 'retainer' | 'installment' | 'final_balance' | 'standard' | 'change_order';
  is_overdue: boolean;
}
