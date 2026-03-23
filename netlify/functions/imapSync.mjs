import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { createClient } from '@supabase/supabase-js';

export const config = {
  schedule: '*/10 * * * *',
};

const requiredEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing ${key}`);
  }
  return value;
};

const firstAvailableEnv = (keys) => {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  throw new Error(`Missing one of required env vars: ${keys.join(', ')}`);
};

const parseBooleanEnv = (value, fallback) => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const normalizeImapError = (error) => {
  if (!(error instanceof Error)) {
    return { message: String(error) };
  }

  const details = {
    message: error.message,
    name: error.name,
    code: error.code || null,
    command: error.command || null,
    responseText: error.responseText || null,
  };

  if (error.cause instanceof Error) {
    details.cause = {
      message: error.cause.message,
      name: error.cause.name,
      code: error.cause.code || null,
    };
  }

  return details;
};

const supabaseAdmin = () =>
  createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });

export const handler = async () => {
  try {
    const host = firstAvailableEnv(['IMAP_HOST', 'ZOHO_IMAP_HOST']);
    const portRaw = firstAvailableEnv(['IMAP_PORT', 'ZOHO_IMAP_PORT']);
    const port = Number(portRaw);
    if (!Number.isFinite(port) || port <= 0) {
      throw new Error(`Invalid IMAP port: ${portRaw}`);
    }

    const user = firstAvailableEnv(['IMAP_USER', 'ZOHO_IMAP_USER']);
    const pass = firstAvailableEnv(['IMAP_PASS', 'ZOHO_IMAP_PASS']);
    const secureDefault = port === 993;
    const secure = parseBooleanEnv(process.env.IMAP_SECURE, secureDefault);
    const rejectUnauthorized = parseBooleanEnv(process.env.IMAP_TLS_REJECT_UNAUTHORIZED, true);

    const imap = new ImapFlow({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: {
        rejectUnauthorized,
      },
    });

    await imap.connect();
    const supabase = supabaseAdmin();

    const lock = await imap.getMailboxLock('INBOX');
    try {
      const unseen = await imap.search({ seen: false });
      if (!unseen.length) {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ok: true, synced: 0 }),
        };
      }

      for await (const msg of imap.fetch(unseen, { uid: true, source: true })) {
        const parsed = await simpleParser(msg.source);
        const messageId = parsed.messageId || `imap-${msg.uid}`;
        const fromAddress = parsed.from?.text || '';
        const toAddress = parsed.to?.text || '';
        const ccAddress = parsed.cc?.text || null;
        const subject = parsed.subject || '';
        const sentAt = parsed.date ? parsed.date.toISOString() : null;
        const textBody = parsed.text || null;
        const htmlBody = typeof parsed.html === 'string' ? parsed.html : null;

        const { error } = await supabase.from('inbox_emails').upsert(
          {
            message_id: messageId,
            from_address: fromAddress,
            to_address: toAddress,
            cc_address: ccAddress,
            subject,
            sent_at: sentAt,
            received_at: new Date().toISOString(),
            text_body: textBody,
            html_body: htmlBody,
            source: process.env.IMAP_SOURCE || 'imap',
            status: 'unread',
          },
          { onConflict: 'message_id' }
        );

        if (!error) {
          await imap.messageFlagsAdd(msg.uid, ['\\Seen']);
        }
      }
    } finally {
      lock.release();
      await imap.logout();
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    };
  } catch (error) {
    const normalized = normalizeImapError(error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: false,
        error: normalized.message || 'IMAP sync failed',
        details: normalized,
      }),
    };
  }
};
