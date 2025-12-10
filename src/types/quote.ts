import type { CurrencyCode } from '../services/currencyService';

export interface QuoteItem {
  id: string;
  product_id?: string; // Optional link to product
  description: string;
  quantity: number;
  unit_price: number; // In MXN
  total: number; // In MXN
}

export interface Quote {
  id: string;
  client_id: string;
  event_id: string;
  items: QuoteItem[];
  
  // Financials
  currency: CurrencyCode;
  exchange_rate: number; // Rate at time of creation (MXN to Currency)
  total_amount: number; // In MXN
  
  // Templates
  questionnaire_template_id?: string;
  contract_template_id?: string;
  payment_plan_template_id?: string;

  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  valid_until: string;
  created_at: string;
  updated_at: string;
}
