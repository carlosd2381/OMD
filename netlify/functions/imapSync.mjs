import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { createClient } from '@supabase/supabase-js';
import dns from 'node:dns/promises';
import net from 'node:net';

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

const parseFetchMode = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'full') return 'full';
  return 'metadata';
};

const formatEnvelopeAddress = (addressList = []) =>
  addressList
    .map((entry) => {
      if (!entry) return null;
      const mailbox = entry.mailbox || '';
      const host = entry.host || '';
      const email = mailbox && host ? `${mailbox}@${host}` : mailbox || host || '';
      if (!email) return null;
      if (entry.name) return `${entry.name} <${email}>`;
      return email;
    })
    .filter(Boolean)
    .join(', ');

const parsePositiveIntEnv = (value, fallback) => {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const chunkArray = (values, size) => {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
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

const resolveHostDiagnostics = async (host) => {
  try {
    const addresses = await dns.lookup(host, { all: true });
    return {
      ok: true,
      addresses,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      code: error?.code || null,
    };
  }
};

const tcpProbe = async (host, port, timeoutMs = 7000) => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finalize = (result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      finalize({ ok: true });
    });

    socket.on('timeout', () => {
      finalize({ ok: false, code: 'ETIMEDOUT', error: `TCP timeout after ${timeoutMs}ms` });
    });

    socket.on('error', (error) => {
      finalize({
        ok: false,
        code: error?.code || null,
        error: error instanceof Error ? error.message : String(error),
      });
    });

    socket.connect(port, host);
  });
};

const supabaseAdmin = () =>
  createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });

export const handler = async () => {
  let host = null;
  let port = null;
  let secure = null;
  let reachability = null;
  let dnsInfo = null;

  try {
    host = firstAvailableEnv(['IMAP_HOST', 'ZOHO_IMAP_HOST']);
    const portRaw = firstAvailableEnv(['IMAP_PORT', 'ZOHO_IMAP_PORT']);
    port = Number(portRaw);
    if (!Number.isFinite(port) || port <= 0) {
      throw new Error(`Invalid IMAP port: ${portRaw}`);
    }

    const user = firstAvailableEnv(['IMAP_USER', 'ZOHO_IMAP_USER']);
    const pass = firstAvailableEnv(['IMAP_PASS', 'ZOHO_IMAP_PASS']);
    const secureDefault = port === 993;
    secure = parseBooleanEnv(process.env.IMAP_SECURE, secureDefault);
    const rejectUnauthorized = parseBooleanEnv(process.env.IMAP_TLS_REJECT_UNAUTHORIZED, true);
    const maxMessagesPerRun = parsePositiveIntEnv(process.env.IMAP_MAX_MESSAGES_PER_RUN, 10);
    const fetchBatchSize = parsePositiveIntEnv(process.env.IMAP_FETCH_BATCH_SIZE, 5);
    const maxRuntimeMs = parsePositiveIntEnv(process.env.IMAP_MAX_RUNTIME_MS, 24000);
    const startedAt = Date.now();
    const allowFullFetch = parseBooleanEnv(process.env.IMAP_ENABLE_FULL_FETCH, false);
    const fetchMode = allowFullFetch ? parseFetchMode(process.env.IMAP_FETCH_MODE) : 'metadata';

    dnsInfo = await resolveHostDiagnostics(host);
    reachability = await tcpProbe(host, port);

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

      const unseenToSync = unseen.slice(-maxMessagesPerRun);
      const batches = chunkArray(unseenToSync, fetchBatchSize);
      let syncedCount = 0;
      let failedCount = 0;
      const writeErrors = [];

      let stoppedEarly = false;
      for (const batch of batches) {
        if (Date.now() - startedAt >= maxRuntimeMs) {
          stoppedEarly = true;
          break;
        }

        const seenUids = [];
        const fetchQuery = fetchMode === 'full' ? { uid: true, envelope: true, source: true } : { uid: true, envelope: true };
        for await (const msg of imap.fetch(batch, fetchQuery)) {
          if (Date.now() - startedAt >= maxRuntimeMs) {
            stoppedEarly = true;
            break;
          }

          let messageId = msg.envelope?.messageId || `imap-${msg.uid}`;
          let fromAddress = formatEnvelopeAddress(msg.envelope?.from);
          let toAddress = formatEnvelopeAddress(msg.envelope?.to);
          let ccAddress = formatEnvelopeAddress(msg.envelope?.cc) || null;
          let subject = msg.envelope?.subject || '';
          let sentAt = msg.envelope?.date ? msg.envelope.date.toISOString() : null;
          let textBody = null;
          let htmlBody = null;

          if (fetchMode === 'full' && msg.source) {
            try {
              const parsed = await simpleParser(msg.source);
              messageId = parsed.messageId || messageId;
              fromAddress = parsed.from?.text || fromAddress;
              toAddress = parsed.to?.text || toAddress;
              ccAddress = parsed.cc?.text || ccAddress;
              subject = parsed.subject || subject;
              sentAt = parsed.date ? parsed.date.toISOString() : sentAt;
              textBody = parsed.text || null;
              htmlBody = typeof parsed.html === 'string' ? parsed.html : null;
            } catch (parseError) {
              writeErrors.push({
                uid: msg.uid,
                step: 'parse',
                message: parseError instanceof Error ? parseError.message : String(parseError),
                details: null,
              });
            }
          }

          if (!messageId) {
            messageId = `imap-${msg.uid}`;
          }

          const row = {
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
          };

          let persisted = false;
          const { error } = await supabase.from('inbox_emails').upsert(row, { onConflict: 'message_id' });

          if (!error) {
            persisted = true;
          } else {
            const message = (error.message || '').toLowerCase();
            const hasMissingConflictConstraint =
              message.includes('no unique or exclusion constraint matching the on conflict specification') ||
              message.includes('there is no unique or exclusion constraint matching the on conflict specification');

            if (hasMissingConflictConstraint) {
              const { data: existingRow, error: findError } = await supabase
                .from('inbox_emails')
                .select('id')
                .eq('message_id', messageId)
                .limit(1)
                .maybeSingle();

              if (!findError) {
                if (existingRow?.id) {
                  const { error: updateError } = await supabase
                    .from('inbox_emails')
                    .update(row)
                    .eq('id', existingRow.id);

                  if (!updateError) {
                    persisted = true;
                  } else {
                    writeErrors.push({
                      uid: msg.uid,
                      step: 'update-fallback',
                      message: updateError.message,
                      details: updateError.details || null,
                    });
                  }
                } else {
                  const { error: insertError } = await supabase.from('inbox_emails').insert(row);
                  if (!insertError) {
                    persisted = true;
                  } else {
                    writeErrors.push({
                      uid: msg.uid,
                      step: 'insert-fallback',
                      message: insertError.message,
                      details: insertError.details || null,
                    });
                  }
                }
              } else {
                writeErrors.push({
                  uid: msg.uid,
                  step: 'find-fallback',
                  message: findError.message,
                  details: findError.details || null,
                });
              }
            } else {
              writeErrors.push({
                uid: msg.uid,
                step: 'upsert',
                message: error.message,
                details: error.details || null,
              });
            }
          }

          if (persisted) {
            syncedCount += 1;
            seenUids.push(msg.uid);
          } else {
            failedCount += 1;
          }
        }

        if (seenUids.length) {
          await imap.messageFlagsAdd(seenUids, ['\\Seen']);
        }

        if (stoppedEarly) {
          break;
        }
      }

      const remaining = Math.max(unseen.length - unseenToSync.length, 0);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ok: true,
          synced: syncedCount,
          processed: unseenToSync.length,
          remaining,
          failed: failedCount,
          fetchMode,
          stoppedEarly,
          runtimeMs: Date.now() - startedAt,
          writeErrors: writeErrors.slice(0, 5),
        }),
      };
    } finally {
      lock.release();
      await imap.logout();
    }
  } catch (error) {
    const normalized = normalizeImapError(error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: false,
        error: normalized.message || 'IMAP sync failed',
        details: normalized,
        connection: {
          host,
          port,
          secure,
        },
        diagnostics: {
          dns: dnsInfo,
          tcp: reachability,
        },
      }),
    };
  }
};
