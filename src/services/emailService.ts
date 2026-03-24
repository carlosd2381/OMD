import { supabase } from '../lib/supabase';
import type { Email } from '../types/email';
import { settingsService } from './settingsService';

const NOTIFICATION_BASE_URL = (import.meta.env.VITE_NOTIFICATIONS_API_URL || '').replace(/\/$/, '');
const EMAIL_ENDPOINT = NOTIFICATION_BASE_URL
  ? `${NOTIFICATION_BASE_URL}/notifications/email`
  : '/.netlify/functions/send-email';
const IMAP_SYNC_ENDPOINT = '/.netlify/functions/imapSync';

export interface OutboundEmailAttachment {
  filename: string;
  contentType: string;
  content: string;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  cc?: string;
  bcc?: string;
  inReplyTo?: string;
  references?: string;
  attachments?: OutboundEmailAttachment[];
}

export interface SendEmailResult {
  ok: boolean;
  message_id?: string | null;
}

export interface InboxSyncResult {
  ok: boolean;
  synced?: number;
  processed?: number;
  remaining?: number;
  failed?: number;
  writeErrors?: Array<{ uid?: number; step?: string; message?: string; details?: string | null }>;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const payload = result.includes(',') ? result.split(',')[1] : result;
      resolve(payload);
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

const toHtml = (text?: string) => (text || '').replace(/\n/g, '<br/>');

export const emailService = {
  async syncInbox(): Promise<InboxSyncResult> {
    const response = await fetch(IMAP_SYNC_ENDPOINT, {
      method: 'POST',
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const parts = [
        payload?.error,
        payload?.details?.responseText,
        payload?.details?.command,
        payload?.details?.code,
        payload?.details?.cause?.code,
        payload?.connection?.host ? `host=${payload.connection.host}` : null,
        payload?.connection?.port ? `port=${payload.connection.port}` : null,
        typeof payload?.connection?.secure === 'boolean' ? `secure=${payload.connection.secure}` : null,
        payload?.diagnostics?.dns?.ok === false ? `dns=${payload.diagnostics.dns.code || payload.diagnostics.dns.error}` : null,
        payload?.diagnostics?.tcp?.ok === false ? `tcp=${payload.diagnostics.tcp.code || payload.diagnostics.tcp.error}` : null,
      ]
        .filter(Boolean)
        .map(String);

      throw new Error(parts.join(' | ') || 'Failed to sync inbox');
    }

    return {
      ok: Boolean(payload?.ok ?? true),
      synced: typeof payload?.synced === 'number' ? payload.synced : undefined,
      processed: typeof payload?.processed === 'number' ? payload.processed : undefined,
      remaining: typeof payload?.remaining === 'number' ? payload.remaining : undefined,
      failed: typeof payload?.failed === 'number' ? payload.failed : undefined,
      writeErrors: Array.isArray(payload?.writeErrors) ? payload.writeErrors : undefined,
    };
  },

  async getEmails(page = 1, pageSize = 50, filters?: { search?: string, status?: string }): Promise<{ emails: Email[], count: number }> {
    let query = supabase
      .from('inbox_emails')
      .select('*', { count: 'exact' });

    if (filters?.status) {
      if (filters.status === 'inbox') {
        // Just general inbox for now
        // query = query.in('status', ['unread', 'read']);
      } else {
        // Safe cast as we know the valid values from the filters
        query = query.eq('status', filters.status as 'unread' | 'read' | 'archived');
      }
    }

    if (filters?.search) {
      query = query.or(`subject.ilike.%${filters.search}%,from_address.ilike.%${filters.search}%,text_body.ilike.%${filters.search}%`);
    }

    const { data, error, count } = await query
      .order('received_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) throw error;
    return { emails: (data as Email[]) || [], count: count || 0 };
  },

  async getEmailsByContact(emailAddress: string): Promise<Email[]> {
    if (!emailAddress) return [];
    
    const { data, error } = await supabase
      .from('inbox_emails')
      .select('*')
      .or(`from_address.ilike.%${emailAddress}%,to_address.ilike.%${emailAddress}%`)
      .order('received_at', { ascending: false });

    if (error) throw error;
    return (data as Email[]) || [];
  },

  async getEmail(id: string): Promise<Email | null> {
    const { data, error } = await supabase
      .from('inbox_emails')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Email;
  },

  async markAsRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('inbox_emails')
      .update({ status: 'read' })
      .eq('id', id);

    if (error) throw error;
  },

  async prepareAttachments(files: File[]): Promise<OutboundEmailAttachment[]> {
    const encoded = await Promise.all(
      files.map(async (file) => ({
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        content: await fileToBase64(file),
      }))
    );
    return encoded;
  },

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    const settings = await settingsService.getEmailSettings();
    const smtpConfig = (settings?.smtp_config || {}) as {
      host?: string;
      port?: number | string;
      username?: string;
      password?: string;
      secure?: boolean;
      replyTo?: string;
    };

    if (!smtpConfig.host || !smtpConfig.username || !smtpConfig.password) {
      throw new Error('SMTP settings are incomplete. Configure them in Settings > Email & Messaging.');
    }

    const response = await fetch(EMAIL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        smtpConfig,
        sender: settings?.sender_identity || {},
        message: {
          ...input,
          html: input.html || toHtml(input.text),
        },
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'Failed to send email');
    }

    const payload = await response.json();
    return {
      ok: Boolean(payload?.ok),
      message_id: payload?.message_id || null,
    };
  }
};
