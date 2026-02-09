export interface Event {
  id: string;
  name: string;
  type?: string;
  date: string;
  client_id: string;
  secondary_client_id?: string;
  venue_id?: string;
  venue_name?: string; // For venues not in the system
  planner_id?: string;
  status: 'inquiry' | 'confirmed' | 'completed' | 'cancelled';
  guest_count?: number;
  budget?: number;
  services?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;

  // New fields from v2 migration
  hashtag?: string;
  dietary_restrictions?: string;
  meet_load_time?: string;
  leave_time?: string;
  arrive_venue_time?: string;
  setup_time?: string;
  start_time?: string;
  end_time?: string;
  venue_contact_id?: string | null;
  venue_address?: string | null;
  venue_contact_name?: string | null;
  venue_contact_phone?: string | null;
  venue_contact_email?: string | null;
  venue_sub_location?: string | null;
  
  planner_company?: string | null;
  planner_name?: string | null;
  planner_first_name?: string | null;
  planner_last_name?: string | null;
  planner_email?: string | null;
  planner_phone?: string | null;
  planner_instagram?: string | null;

  day_of_contact_name?: string;
  day_of_contact_phone?: string;
}
