export interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company_name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  role?: 'Bride' | 'Groom' | 'Parent' | 'External Planner' | 'Hotel/Resort' | 'Private Venue';
  type?: 'Direct' | 'Preferred Vendor';
  lead_source?: 'Website' | 'Facebook' | 'Facebook Group' | 'Instagram' | 'TikTok' | 'External Planner' | 'Hotel/Venue' | 'Hotel/Venue PV' | 'Vendor Referral' | 'Client Referral' | 'Other';
  instagram?: string;
  facebook?: string;
  notes?: string;
  portal_access?: boolean;
  portal_last_login?: string;
  portal_settings?: {
    show_quotes: boolean;
    show_contracts: boolean;
    show_invoices: boolean;
    show_questionnaires: boolean;
  };
  created_at: string;
  updated_at: string;
}

export type CreateClientDTO = Omit<Client, 'id' | 'created_at' | 'updated_at'>;
export type UpdateClientDTO = Partial<CreateClientDTO>;
