import { supabase } from '../lib/supabase';
import type { Conversation, ConversationMessage, ContactIdentity, MessageAttachment } from '../types/conversation';

const db = supabase as any;

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  role: 'client' | 'admin' | 'venue' | 'provider' | 'planner' | 'other';
  display_name?: string | null;
  email?: string | null;
  external_user_id?: string | null;
}

export interface ConversationThread {
  conversation: Conversation;
  participants: ConversationParticipant[];
  messages: ConversationMessage[];
}

export interface OutboundAttachmentMetadata {
  storage_path?: string | null;
  filename: string;
  mime_type?: string | null;
  size_bytes?: number | null;
}

const byDateAsc = (a: { sent_at: string }, b: { sent_at: string }) =>
  new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime();

const splitByConversation = <T extends { conversation_id: string }>(items: T[]) => {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    if (!acc[item.conversation_id]) acc[item.conversation_id] = [];
    acc[item.conversation_id].push(item);
    return acc;
  }, {});
};

const splitByMessage = <T extends { message_id: string }>(items: T[]) => {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    if (!acc[item.message_id]) acc[item.message_id] = [];
    acc[item.message_id].push(item);
    return acc;
  }, {});
};

const attachFilesToMessages = (
  messages: ConversationMessage[],
  attachmentsByMessage: Record<string, MessageAttachment[]>
): ConversationMessage[] =>
  messages.map((message) => ({
    ...message,
    attachments: attachmentsByMessage[message.id] || [],
  }));

export const conversationService = {
  async getInboxConversations(limit = 100): Promise<ConversationThread[]> {
    const { data: conversations, error } = await db
      .from('conversations')
      .select('*')
      .order('last_message_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    if (!conversations?.length) return [];

    const conversationIds = conversations.map((conversation: Conversation) => conversation.id);

    const [{ data: participants, error: participantError }, { data: messages, error: messageError }] = await Promise.all([
      db
        .from('conversation_participants')
        .select('*')
        .in('conversation_id', conversationIds),
      db
        .from('conversation_messages')
        .select('*')
        .in('conversation_id', conversationIds)
        .order('sent_at', { ascending: true }),
    ]);

    if (participantError) throw participantError;
    if (messageError) throw messageError;

    const messageIds = ((messages || []) as ConversationMessage[]).map((message) => message.id);
    const { data: attachments, error: attachmentsError } = messageIds.length
      ? await db
          .from('message_attachments')
          .select('*')
          .in('message_id', messageIds)
      : { data: [], error: null };

    if (attachmentsError) throw attachmentsError;

    const participantsByConversation = splitByConversation((participants || []) as ConversationParticipant[]);
    const messagesByConversation = splitByConversation((messages || []) as ConversationMessage[]);
    const attachmentsByMessage = splitByMessage((attachments || []) as MessageAttachment[]);

    return (conversations as Conversation[]).map((conversation) => ({
      conversation,
      participants: participantsByConversation[conversation.id] || [],
      messages: attachFilesToMessages(
        (messagesByConversation[conversation.id] || []).sort(byDateAsc),
        attachmentsByMessage
      ),
    }));
  },

  async getConversationThread(conversationId: string): Promise<ConversationThread | null> {
    const [{ data: conversation, error: conversationError }, { data: participants, error: participantError }, { data: messages, error: messageError }] = await Promise.all([
      db.from('conversations').select('*').eq('id', conversationId).single(),
      db.from('conversation_participants').select('*').eq('conversation_id', conversationId),
      db
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('sent_at', { ascending: true }),
    ]);

    if (conversationError) {
      if (conversationError.code === 'PGRST116') return null;
      throw conversationError;
    }
    if (participantError) throw participantError;
    if (messageError) throw messageError;

    const sortedMessages = ((messages || []) as ConversationMessage[]).sort(byDateAsc);
    const messageIds = sortedMessages.map((message) => message.id);

    const { data: attachments, error: attachmentsError } = messageIds.length
      ? await db
          .from('message_attachments')
          .select('*')
          .in('message_id', messageIds)
      : { data: [], error: null };

    if (attachmentsError) throw attachmentsError;

    const attachmentsByMessage = splitByMessage((attachments || []) as MessageAttachment[]);

    return {
      conversation: conversation as Conversation,
      participants: (participants || []) as ConversationParticipant[],
      messages: attachFilesToMessages(sortedMessages, attachmentsByMessage),
    };
  },

  async getConversationMessages(conversationId: string): Promise<ConversationMessage[]> {
    const { data, error } = await db
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('sent_at', { ascending: true });

    if (error) throw error;
    return (data || []) as ConversationMessage[];
  },

  async linkConversationToClient(conversationId: string, clientId: string): Promise<void> {
    const { error } = await db
      .from('conversations')
      .update({ client_id: clientId, updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    if (error) throw error;
  },

  async markConversationRead(conversationId: string): Promise<void> {
    const { error } = await db
      .from('conversations')
      .update({ unread_count: 0, updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    if (error) throw error;
  },

  async logOutboundEmailMessage(
    conversationId: string,
    bodyText: string,
    externalMessageId?: string,
    attachments: OutboundAttachmentMetadata[] = []
  ): Promise<void> {
    const participantKey = `admin:email`;

    const { data: participant, error: participantError } = await db
      .from('conversation_participants')
      .upsert(
        {
          conversation_id: conversationId,
          role: 'admin',
          display_name: 'OMD Team',
          external_user_id: participantKey,
        },
        { onConflict: 'conversation_id,external_user_id' }
      )
      .select('*')
      .single();

    if (participantError) throw participantError;

    const sentAt = new Date().toISOString();
    const { data: insertedMessage, error: messageError } = await db.from('conversation_messages').insert({
      conversation_id: conversationId,
      sender_participant_id: participant.id,
      direction: 'outbound',
      body_text: bodyText,
      external_message_id: externalMessageId || null,
      sent_at: sentAt,
      delivery_status: 'sent',
    }).select('*').single();

    if (messageError) throw messageError;

    if (attachments.length > 0) {
      const payload = attachments.map((attachment) => ({
        message_id: insertedMessage.id,
        storage_path: attachment.storage_path || null,
        filename: attachment.filename,
        mime_type: attachment.mime_type || null,
        size_bytes: attachment.size_bytes ?? null,
      }));

      const { error: attachmentError } = await db
        .from('message_attachments')
        .insert(payload);

      if (attachmentError) throw attachmentError;
    }

    const { error: conversationError } = await db
      .from('conversations')
      .update({ last_message_at: sentAt, updated_at: sentAt })
      .eq('id', conversationId);

    if (conversationError) throw conversationError;
  },

  async addClientEmailIdentity(clientId: string, email: string, isPrimary = false): Promise<ContactIdentity> {
    const normalizedEmail = email.trim().toLowerCase();

    const { data, error } = await db
      .from('contact_identities')
      .upsert({
        client_id: clientId,
        type: 'email',
        value: normalizedEmail,
        is_primary: isPrimary,
      }, { onConflict: 'type,value' })
      .select('*')
      .single();

    if (error) throw error;
    return data as ContactIdentity;
  },
};
