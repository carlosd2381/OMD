export interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role?: 'Bride' | 'Groom' | 'Parent' | 'External Planner' | 'Hotel/Resort' | 'Private Venue';
  event_type?: 'Wedding' | 'Social Event' | 'Corporate Event' | 'Convention' | 'Other';
  event_date?: string;
  guest_count?: number;
  venue_name?: string;
  services_interested?: string[];
  notes?: string;
  lead_source?: 'Website' | 'Facebook' | 'Facebook Group' | 'Instagram' | 'TikTok' | 'External Planner' | 'Hotel/Venue' | 'Hotel/Venue PV' | 'Vendor Referral' | 'Client Referral' | 'Other';
  status: 'New' | 'Contacted' | 'Qualified' | 'Converted' | 'Lost';
  created_at: string;
  updated_at: string;
}

export type CreateLeadDTO = Omit<Lead, 'id' | 'created_at' | 'updated_at'>;
export type UpdateLeadDTO = Partial<CreateLeadDTO>;
