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

const supabaseAdmin = () =>
  createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });

export const handler = async () => {
  const host = requiredEnv('ZOHO_IMAP_HOST');
  const port = Number(requiredEnv('ZOHO_IMAP_PORT'));
  const user = requiredEnv('ZOHO_IMAP_USER');
  const pass = requiredEnv('ZOHO_IMAP_PASS');

  const imap = new ImapFlow({
    host,
    port,
    secure: true,
    auth: { user, pass },
  });

  await imap.connect();
  const supabase = supabaseAdmin();

  try {
    const lock = await imap.getMailboxLock('INBOX');
    try {
      const unseen = await imap.search({ seen: false });
      if (!unseen.length) {
        return {
          statusCode: 200,
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
            source: 'zoho',
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
    }
  } finally {
    await imap.logout();
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true }),
  };
};
