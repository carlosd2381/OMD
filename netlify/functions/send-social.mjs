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

const resolveIntegration = async (supabase, { integrationId, platform }) => {
  let query = supabase
    .from('social_integrations')
    .select('*')
    .eq('is_active', true)
    .limit(1);

  if (integrationId) {
    query = query.eq('id', integrationId);
  } else if (platform) {
    query = query.eq('platform', platform);
  }

  const { data, error } = await query.single();
  if (error) throw error;
  return data;
};

const sendGraphMessage = async ({ integration, recipientId, text, attachmentUrl }) => {
  const endpoint = `https://graph.facebook.com/v23.0/${integration.page_id}/messages?access_token=${encodeURIComponent(integration.access_token)}`;

  const payload = {
    messaging_type: 'RESPONSE',
    recipient: { id: recipientId },
    message: attachmentUrl
      ? {
          attachment: {
            type: 'file',
            payload: {
              url: attachmentUrl,
              is_reusable: true,
            },
          },
        }
      : {
          text,
        },
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok || result.error) {
    throw new Error(result?.error?.message || 'Failed to send social message');
  }

  return result;
};

const ensureAdminParticipant = async (supabase, conversationId, pageId) => {
  const { data, error } = await supabase
    .from('conversation_participants')
    .upsert(
      {
        conversation_id: conversationId,
        role: 'admin',
        display_name: 'Business Page',
        external_user_id: pageId,
      },
      { onConflict: 'conversation_id,external_user_id' }
    )
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

const filenameFromUrl = (url) => {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    return segments[segments.length - 1] || 'attachment';
  } catch {
    return 'attachment';
  }
};

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  try {
    const { integrationId, platform, recipientId, text, attachmentUrl, conversationId } = JSON.parse(event.body || '{}');

    if (!recipientId || (!text && !attachmentUrl)) {
      return jsonResponse(400, { error: 'recipientId and text or attachmentUrl are required.' });
    }

    const supabase = supabaseAdmin();
    const integration = await resolveIntegration(supabase, { integrationId, platform });

    const result = await sendGraphMessage({
      integration,
      recipientId,
      text,
      attachmentUrl,
    });

    if (conversationId) {
      const participant = await ensureAdminParticipant(supabase, conversationId, integration.page_id);

      const sentAt = new Date().toISOString();
      const { data: insertedMessage, error: messageError } = await supabase.from('conversation_messages').insert({
        conversation_id: conversationId,
        sender_participant_id: participant.id,
        direction: 'outbound',
        body_text: text || (attachmentUrl ? `[Attachment] ${attachmentUrl}` : null),
        external_message_id: result.message_id || null,
        sent_at: sentAt,
        delivery_status: 'sent',
      }).select('*').single();

      if (messageError) throw messageError;

      if (attachmentUrl) {
        const { error: attachmentError } = await supabase
          .from('message_attachments')
          .insert({
            message_id: insertedMessage.id,
            storage_path: attachmentUrl,
            filename: filenameFromUrl(attachmentUrl),
          });

        if (attachmentError) throw attachmentError;
      }

      const { error: conversationError } = await supabase
        .from('conversations')
        .update({
          updated_at: sentAt,
          last_message_at: sentAt,
        })
        .eq('id', conversationId);

      if (conversationError) throw conversationError;
    }

    return jsonResponse(200, {
      ok: true,
      message_id: result.message_id || null,
      recipient_id: result.recipient_id || recipientId,
    });
  } catch (error) {
    return jsonResponse(500, { error: error instanceof Error ? error.message : String(error) });
  }
};
