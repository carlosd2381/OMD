export interface Email {
  id: string;
  message_id: string;
  from_address: string;
  to_address: string;
  cc_address?: string;
  subject: string;
  sent_at: string;
  received_at: string;
  text_body?: string;
  html_body?: string;
  source: string;
  status: 'unread' | 'read' | 'archived';
  created_at: string;
}
