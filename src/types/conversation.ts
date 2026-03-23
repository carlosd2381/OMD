export type ConversationChannel = 'email' | 'facebook' | 'instagram';
export type ConversationStatus = 'open' | 'pending' | 'closed';

export interface Conversation {
  id: string;
  channel: ConversationChannel;
  external_thread_id?: string | null;
  subject?: string | null;
  client_id?: string | null;
  status: ConversationStatus;
  assigned_user_id?: string | null;
  last_message_at?: string | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  role: 'client' | 'admin' | 'venue' | 'provider' | 'planner' | 'other';
  display_name?: string | null;
  email?: string | null;
  phone?: string | null;
  social_handle?: string | null;
  external_user_id?: string | null;
  created_at: string;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  sender_participant_id?: string | null;
  direction: 'inbound' | 'outbound';
  body_text?: string | null;
  body_html?: string | null;
  external_message_id?: string | null;
  sent_at: string;
  delivery_status?: string | null;
  error?: string | null;
  created_at: string;
  attachments?: MessageAttachment[];
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  storage_path?: string | null;
  filename: string;
  mime_type?: string | null;
  size_bytes?: number | null;
  created_at: string;
}

export interface ContactIdentity {
  id: string;
  client_id: string;
  type: 'email' | 'phone' | 'facebook' | 'instagram';
  value: string;
  is_primary: boolean;
  created_at: string;
}
