export interface EventExpense {
  id: string;
  event_id: string;
  name: string;
  description?: string;
  amount_usd: number;
  amount_mxn: number;
  category_id?: string;
  date: string;
  created_at: string;
}

export interface EventCommission {
  id: string;
  event_id: string;
  type: string;
  percentage: number;
  currency: string;
  payment_method?: string;
  from_account?: string;
  to_account?: string;
  amount: number;
  created_at: string;
}

export interface EventFiscalDetails {
  id: string;
  event_id: string;
  date_required?: string;
  currency: string;
  link_pdf?: string;
  date_requested?: string;
  exchange_rate: number;
  link_xml?: string;
  date_submitted?: string;
  folio?: string;
  subtotal: number;
  iva: number;
  isr: number;
  iva_ret: number;
  isr_ret: number;
  total: number;
  created_at: string;
}
