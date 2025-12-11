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
  venue_contact_id?: string;
  day_of_contact_name?: string;
  day_of_contact_phone?: string;

  // New fields from v3 migration (Questionnaire support)
  venue_sub_location?: string;
  venue_contact_name?: string;
  venue_contact_phone?: string;
  venue_contact_email?: string;
  planner_company?: string;
  planner_name?: string;
  planner_phone?: string;
  planner_email?: string;
  planner_instagram?: string;
}
