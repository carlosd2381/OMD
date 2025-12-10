export interface InvoiceItem {
  id: string;
  description: string;
  amount: number;
}

export interface Invoice {
  id: string;
  client_id: string;
  event_id: string;
  invoice_number: string;
  items: InvoiceItem[];
  total_amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  due_date: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}
