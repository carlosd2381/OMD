import { supabase } from '../lib/supabase';

const NOTIFICATION_BASE_URL = (import.meta.env.VITE_NOTIFICATIONS_API_URL || '').replace(/\/$/, '');
const SOCIAL_SEND_ENDPOINT = NOTIFICATION_BASE_URL
  ? `${NOTIFICATION_BASE_URL}/notifications/social/send`
  : '/.netlify/functions/send-social';

const SOCIAL_ATTACHMENT_BUCKET = 'messages-attachments';

const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

export interface SendSocialMessageInput {
  integrationId?: string;
  platform?: 'facebook' | 'instagram';
  recipientId: string;
  text?: string;
  attachmentUrl?: string;
  conversationId?: string;
}

export const socialMessageService = {
  async uploadAttachment(file: File): Promise<string> {
    const filePath = `social/${Date.now()}-${sanitizeFileName(file.name)}`;

    const { error } = await supabase.storage
      .from(SOCIAL_ATTACHMENT_BUCKET)
      .upload(filePath, file, { upsert: false });

    if (error) throw error;

    const { data } = supabase.storage
      .from(SOCIAL_ATTACHMENT_BUCKET)
      .getPublicUrl(filePath);

    if (!data?.publicUrl) {
      throw new Error('Failed to generate public URL for social attachment.');
    }

    return data.publicUrl;
  },

  async uploadAttachments(files: File[]): Promise<string[]> {
    return Promise.all(files.map((file) => socialMessageService.uploadAttachment(file)));
  },

  async sendMessage(input: SendSocialMessageInput): Promise<{ message_id?: string | null; recipient_id?: string | null }> {
    const response = await fetch(SOCIAL_SEND_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error || 'Failed to send social message');
    }

    return payload;
  },
};
