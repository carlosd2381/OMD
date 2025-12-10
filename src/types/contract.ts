export interface Contract {
  id: string;
  client_id: string;
  event_id: string;
  content: string; // HTML or Markdown content
  status: 'draft' | 'sent' | 'signed';
  signed_at?: string;
  signed_by?: string; // Client name or IP
  created_at: string;
  updated_at: string;
}
