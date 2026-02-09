export type StaffPayRateType = 'flat' | 'per_direction' | 'percent_revenue' | 'tiered_hours' | 'tiered_quantity';

export interface StaffPayRateRule {
  id?: string;
  position_key: string;
  position_label: string;
  rate_type: StaffPayRateType;
  config: Record<string, any>;
  notes?: string;
}

export interface StaffCompensationConfig {
  overrides?: {
    directions?: number;
    hours?: number;
    quantity?: number;
    percentage?: number;
    [key: string]: number | undefined;
  };
  manual_total?: number;
  notes?: string;
}

export interface StaffProfile {
  id: string; // Links to public.users.id
  user_id: string;
  first_name: string;
  last_name: string;
  email: string; // Read from users table
  phone?: string;
  address?: string;
  date_of_birth?: string;
  
  // ID Details
  id_type?: 'INE' | 'Passport' | 'Driver License' | 'Other';
  id_number?: string;
  id_expiration_date?: string;
  id_front_url?: string;
  id_back_url?: string;
  
  is_driver: boolean;

  // Banking Details
  bank_name?: string;
  card_number?: string;
  clabe?: string;
  account_number?: string;
  
  // System Metadata
  created_at: string;
  updated_at: string;
}

export interface EventStaffAssignment {
  id: string;
  event_id: string;
  staff_id: string; // Links to StaffProfile.id (or user_id)
  role: string; // e.g. "Server", "Bartender", "Driver"
  status: 'pending' | 'confirmed' | 'declined' | 'completed';
  
  // Timing for Payroll
  start_time?: string;
  end_time?: string;
  hours_worked?: number;
  
  // Financials
  pay_rate?: number; // Hourly or Flat
  pay_type: 'hourly' | 'flat';
  total_pay?: number;
  pay_rate_id?: string | null;
  compensation_config?: StaffCompensationConfig | null;
  
  // Payroll Status
  is_paid: boolean;
  paid_at?: string;
  payment_reference?: string; // e.g. "Weekly Run Dec 21-27"
  payment_method?: string;
  from_account?: string;
  to_account?: string;
  
  // Joined Data
  event?: {
    name: string;
    date: string;
    venue_name?: string;
  };
  staff?: {
    first_name: string;
    last_name: string;
  };
}

export interface PayrollRun {
  id: string;
  period_start: string; // Sunday
  period_end: string; // Saturday
  payment_date: string; // Wednesday
  total_amount: number;
  status: 'draft' | 'processed' | 'paid';
  items?: EventStaffAssignment[];
}
