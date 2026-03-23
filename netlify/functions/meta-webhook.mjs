import { createHmac, timingSafeEqual } from 'node:crypto';
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

const supabaseAdmin = () =>
  createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });

const parseBody = (event) => {
  if (!event.body) return {};
  const rawBody = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  return { rawBody, payload: JSON.parse(rawBody) };
};

const verifyMetaSignature = (event, rawBody) => {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return true;

  const signatureHeader = event.headers['x-hub-signature-256'] || event.headers['X-Hub-Signature-256'];
  if (!signatureHeader?.startsWith('sha256=')) return false;

  const signature = signatureHeader.slice(7);
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

  if (signature.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
};

const getPlatformFromEntry = (objectType, event) => {
  if (objectType === 'instagram') return 'instagram';

  const recipientId = event?.recipient?.id;
  if (recipientId && String(recipientId).startsWith('1784')) return 'instagram';

  return 'facebook';
};

const getMessageText = (message) => {
  if (!message) return '';
  if (message.text) return message.text;

  if (Array.isArray(message.attachments) && message.attachments.length > 0) {
    const labels = message.attachments.map((attachment) => attachment.type || 'file').join(', ');
    return `[Attachment: ${labels}]`;
  }

  return '';
};

const upsertConversation = async ({ supabase, platform, senderId, subject, clientId, eventTimestamp }) => {
  const externalThreadId = `${platform}:${senderId}`;

  const { data, error } = await supabase
    .from('conversations')
    .upsert(
      {
        channel: platform,
        external_thread_id: externalThreadId,
        subject,
        client_id: clientId || null,
        status: 'open',
        last_message_at: eventTimestamp,
        unread_count: 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'channel,external_thread_id' }
    )
    .select('*')
    .single();

  if (error) throw error;

  const { error: updateError } = await supabase
    .from('conversations')
    .update({
      last_message_at: eventTimestamp,
      unread_count: (data.unread_count || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', data.id);

  if (updateError) throw updateError;

  return data;
};

const upsertParticipant = async ({ supabase, conversationId, role, displayName, externalUserId }) => {
  const { data, error } = await supabase
    .from('conversation_participants')
    .upsert(
      {
        conversation_id: conversationId,
        role,
        display_name: displayName || null,
        external_user_id: externalUserId,
      },
      { onConflict: 'conversation_id,external_user_id' }
    )
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

const findClientByIdentity = async ({ supabase, platform, senderId }) => {
  const { data: identity, error: identityError } = await supabase
    .from('contact_identities')
    .select('client_id')
    .eq('type', platform)
    .eq('value', senderId)
    .limit(1)
    .maybeSingle();

  if (identityError) throw identityError;
  return identity?.client_id || null;
};

export const handler = async (event) => {
  if (event.httpMethod === 'GET') {
    const mode = event.queryStringParameters?.['hub.mode'];
    const token = event.queryStringParameters?.['hub.verify_token'];
    const challenge = event.queryStringParameters?.['hub.challenge'];

    if (mode === 'subscribe' && token && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/plain' },
        body: challenge || '',
      };
    }

    return { statusCode: 403, body: 'Forbidden' };
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  try {
    const { rawBody, payload } = parseBody(event);

    if (!verifyMetaSignature(event, rawBody || '')) {
      return jsonResponse(401, { error: 'Invalid signature' });
    }

    if (!payload?.entry?.length) {
      return jsonResponse(200, { ok: true, processed: 0 });
    }

    const supabase = supabaseAdmin();
    let processed = 0;

    for (const entry of payload.entry) {
      const events = entry.messaging || [];
      for (const messageEvent of events) {
        if (!messageEvent.message || messageEvent.message.is_echo) continue;

        const platform = getPlatformFromEntry(payload.object, messageEvent);
        const senderId = String(messageEvent.sender?.id || '');
        const recipientId = String(messageEvent.recipient?.id || '');
        const externalMessageId = messageEvent.message.mid || `${platform}-${messageEvent.timestamp}-${senderId}`;
        const eventTimestamp = messageEvent.timestamp
          ? new Date(messageEvent.timestamp).toISOString()
          : new Date().toISOString();

        if (!senderId || !recipientId) continue;

        const clientId = await findClientByIdentity({ supabase, platform, senderId });

        const conversation = await upsertConversation({
          supabase,
          platform,
          senderId,
          subject: platform === 'facebook' ? 'Facebook Messenger' : 'Instagram Direct',
          clientId,
          eventTimestamp,
        });

        const clientParticipant = await upsertParticipant({
          supabase,
          conversationId: conversation.id,
          role: 'client',
          displayName: `Social User ${senderId.slice(-6)}`,
          externalUserId: senderId,
        });

        await upsertParticipant({
          supabase,
          conversationId: conversation.id,
          role: 'admin',
          displayName: 'Business Page',
          externalUserId: recipientId,
        });

        const messageText = getMessageText(messageEvent.message);

        const { error: messageError } = await supabase
          .from('conversation_messages')
          .upsert(
            {
              conversation_id: conversation.id,
              sender_participant_id: clientParticipant.id,
              direction: 'inbound',
              body_text: messageText || null,
              external_message_id: externalMessageId,
              sent_at: eventTimestamp,
              delivery_status: 'received',
            },
            { onConflict: 'conversation_id,external_message_id' }
          );

        if (messageError) throw messageError;

        processed += 1;
      }
    }

    return jsonResponse(200, { ok: true, processed });
  } catch (error) {
    return jsonResponse(500, { error: error instanceof Error ? error.message : String(error) });
  }
};
