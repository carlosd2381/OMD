import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { createClient } from '@supabase/supabase-js';

const jsonResponse = (statusCode, payload) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

const requiredEnv = (key) => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing ${key}`);
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

const supabaseAdmin = () =>
  createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });

const normalizeMessageId = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  return trimmed.startsWith('<') && trimmed.endsWith('>') ? trimmed : `<${trimmed.replace(/^<|>$/g, '')}>`;
};

const toIsoDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { ok: false, error: 'Method not allowed' });
  }

  let imap = null;
  let lock = null;

  try {
    const payload = JSON.parse(event.body || '{}');
    const conversationId = String(payload?.conversationId || '').trim();
    const limitRaw = Number.parseInt(String(payload?.limit || ''), 10);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 10) : 3;

    if (!conversationId) {
      return jsonResponse(400, { ok: false, error: 'conversationId is required' });
    }

    const supabase = supabaseAdmin();

    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('id, channel')
      .eq('id', conversationId)
      .single();

    if (conversationError) throw conversationError;
    if (!conversation || conversation.channel !== 'email') {
      return jsonResponse(400, { ok: false, error: 'Conversation is not an email thread' });
    }

    const { data: candidateMessages, error: messageError } = await supabase
      .from('conversation_messages')
      .select('id, external_message_id, direction, body_text, body_html')
      .eq('conversation_id', conversationId)
      .eq('direction', 'inbound')
      .is('body_text', null)
      .is('body_html', null)
      .not('external_message_id', 'is', null)
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (messageError) throw messageError;

    if (!candidateMessages?.length) {
      return jsonResponse(200, { ok: true, hydrated: 0, checked: 0 });
    }

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

    imap = new ImapFlow({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: { rejectUnauthorized },
    });

    await imap.connect();
    lock = await imap.getMailboxLock('INBOX');

    let hydrated = 0;
    const errors = [];

    for (const message of candidateMessages) {
      const externalMessageId = normalizeMessageId(message.external_message_id);
      if (!externalMessageId) continue;

      try {
        let searchResult = await imap.search({ header: ['Message-ID', externalMessageId] });

        if (!searchResult.length) {
          const fallbackId = externalMessageId.replace(/^<|>$/g, '');
          searchResult = await imap.search({ header: ['Message-ID', fallbackId] });
        }

        if (!searchResult.length) {
          errors.push({ message_id: message.id, reason: 'not-found' });
          continue;
        }

        const targetSeq = searchResult[searchResult.length - 1];
        let parsed = null;
        let envelope = null;

        for await (const fetched of imap.fetch([targetSeq], { uid: true, envelope: true, source: true })) {
          envelope = fetched.envelope || null;
          if (fetched.source) {
            parsed = await simpleParser(fetched.source);
          }
          break;
        }

        const textBody = parsed?.text || null;
        const htmlBody = typeof parsed?.html === 'string' ? parsed.html : null;

        if (!textBody && !htmlBody) {
          errors.push({ message_id: message.id, reason: 'empty-body' });
          continue;
        }

        const sentAt = toIsoDate(parsed?.date || envelope?.date);
        const fromAddress = parsed?.from?.text || null;
        const toAddress = parsed?.to?.text || null;
        const ccAddress = parsed?.cc?.text || null;
        const subject = parsed?.subject || envelope?.subject || null;

        const { error: updateConversationMessageError } = await supabase
          .from('conversation_messages')
          .update({
            body_text: textBody,
            body_html: htmlBody,
          })
          .eq('id', message.id);

        if (updateConversationMessageError) throw updateConversationMessageError;

        const { error: updateInboxEmailError } = await supabase
          .from('inbox_emails')
          .update({
            text_body: textBody,
            html_body: htmlBody,
            sent_at: sentAt,
            from_address: fromAddress,
            to_address: toAddress,
            cc_address: ccAddress,
            subject,
          })
          .eq('message_id', externalMessageId);

        if (updateInboxEmailError) {
          errors.push({ message_id: message.id, reason: 'inbox-update-failed', detail: updateInboxEmailError.message });
        }

        hydrated += 1;
      } catch (messageError) {
        errors.push({
          message_id: message.id,
          reason: 'hydrate-failed',
          detail: messageError instanceof Error ? messageError.message : String(messageError),
        });
      }
    }

    return jsonResponse(200, {
      ok: true,
      hydrated,
      checked: candidateMessages.length,
      errors: errors.slice(0, 5),
    });
  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    try {
      if (lock) {
        lock.release();
      }
    } catch {
      // noop
    }

    try {
      if (imap) {
        await imap.logout();
      }
    } catch {
      // noop
    }
  }
};
