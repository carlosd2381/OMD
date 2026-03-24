-- Fix ambiguous column reference in inbox->unified trigger function

CREATE OR REPLACE FUNCTION public.sync_inbox_email_to_unified_inbox()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_email text;
  linked_client_id uuid;
  normalized_subject text;
  v_conversation_id uuid;
  v_participant_id uuid;
BEGIN
  normalized_email := lower(trim(NEW.from_address));
  normalized_subject := COALESCE(NULLIF(trim(NEW.subject), ''), '(No Subject)');

  SELECT ci.client_id
  INTO linked_client_id
  FROM public.contact_identities ci
  WHERE ci.type = 'email'
    AND lower(ci.value) = normalized_email
  LIMIT 1;

  IF linked_client_id IS NULL THEN
    SELECT c.id
    INTO linked_client_id
    FROM public.clients c
    WHERE lower(c.email) = normalized_email
    LIMIT 1;
  END IF;

  INSERT INTO public.conversations (
    channel,
    external_thread_id,
    subject,
    client_id,
    status,
    last_message_at,
    unread_count,
    created_at,
    updated_at
  )
  VALUES (
    'email',
    NEW.message_id,
    normalized_subject,
    linked_client_id,
    'open',
    COALESCE(NEW.received_at, NEW.sent_at, now()),
    1,
    now(),
    now()
  )
  ON CONFLICT ON CONSTRAINT conversations_channel_external_thread_id_key
  DO UPDATE SET
    subject = COALESCE(EXCLUDED.subject, public.conversations.subject),
    client_id = COALESCE(public.conversations.client_id, EXCLUDED.client_id),
    last_message_at = GREATEST(public.conversations.last_message_at, EXCLUDED.last_message_at),
    unread_count = public.conversations.unread_count + 1,
    updated_at = now()
  RETURNING id INTO v_conversation_id;

  INSERT INTO public.conversation_participants (
    conversation_id,
    role,
    display_name,
    email,
    created_at
  )
  VALUES (
    v_conversation_id,
    'client',
    NEW.from_address,
    normalized_email,
    now()
  )
  ON CONFLICT ON CONSTRAINT conversation_participants_conversation_id_email_key
  DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, public.conversation_participants.display_name)
  RETURNING id INTO v_participant_id;

  INSERT INTO public.conversation_messages (
    conversation_id,
    sender_participant_id,
    direction,
    body_text,
    body_html,
    external_message_id,
    sent_at,
    delivery_status,
    created_at
  )
  VALUES (
    v_conversation_id,
    v_participant_id,
    'inbound',
    NEW.text_body,
    NEW.html_body,
    NEW.message_id,
    COALESCE(NEW.received_at, NEW.sent_at, now()),
    'received',
    now()
  )
  ON CONFLICT ON CONSTRAINT conversation_messages_conversation_id_external_message_id_key
  DO NOTHING;

  RETURN NEW;
END;
$$;
