export interface Event {
  id: string;
  name: string;
  date: string;
  client_id: string;
  venue_id?: string;
  planner_id?: string;
  status: 'inquiry' | 'confirmed' | 'completed' | 'cancelled';
  guest_count?: number;
  budget?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}
