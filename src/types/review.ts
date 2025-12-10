export interface Review {
  id: string;
  client_id: string;
  event_id: string;
  rating: number; // 1-5
  comment: string;
  status: 'pending' | 'submitted';
  created_at: string;
  submitted_at?: string;
}
