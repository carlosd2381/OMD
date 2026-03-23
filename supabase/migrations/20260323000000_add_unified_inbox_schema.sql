-- Unified inbox schema (email + social) with client-linking support

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel text NOT NULL CHECK (channel IN ('email', 'facebook', 'instagram')),
  external_thread_id text,
  subject text,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'closed')),
  assigned_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  last_message_at timestamptz,
  unread_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(channel, external_thread_id)
);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('client', 'admin', 'venue', 'provider', 'planner', 'other')),
  display_name text,
  email text,
  phone text,
  social_handle text,
  external_user_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, email),
  UNIQUE(conversation_id, external_user_id)
);

CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_participant_id uuid REFERENCES public.conversation_participants(id) ON DELETE SET NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  body_text text,
  body_html text,
  external_message_id text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  delivery_status text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, external_message_id)
);

CREATE TABLE IF NOT EXISTS public.message_attachments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id uuid NOT NULL REFERENCES public.conversation_messages(id) ON DELETE CASCADE,
  storage_path text,
  filename text NOT NULL,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contact_identities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('email', 'phone', 'facebook', 'instagram')),
  value text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(type, value)
);

CREATE INDEX IF NOT EXISTS conversations_channel_last_message_idx
  ON public.conversations(channel, last_message_at DESC);

CREATE INDEX IF NOT EXISTS conversations_client_idx
  ON public.conversations(client_id);

CREATE INDEX IF NOT EXISTS conversation_messages_conversation_sent_idx
  ON public.conversation_messages(conversation_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS contact_identities_lookup_idx
  ON public.contact_identities(type, value);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_identities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff full access to conversations" ON public.conversations;
CREATE POLICY "Staff full access to conversations" ON public.conversations
  FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Staff full access to conversation_participants" ON public.conversation_participants;
CREATE POLICY "Staff full access to conversation_participants" ON public.conversation_participants
  FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Staff full access to conversation_messages" ON public.conversation_messages;
CREATE POLICY "Staff full access to conversation_messages" ON public.conversation_messages
  FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Staff full access to message_attachments" ON public.message_attachments;
CREATE POLICY "Staff full access to message_attachments" ON public.message_attachments
  FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Staff full access to contact_identities" ON public.contact_identities;
CREATE POLICY "Staff full access to contact_identities" ON public.contact_identities
  FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

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
  conversation_id uuid;
  participant_id uuid;
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
  ON CONFLICT (channel, external_thread_id)
  DO UPDATE SET
    subject = COALESCE(EXCLUDED.subject, public.conversations.subject),
    client_id = COALESCE(public.conversations.client_id, EXCLUDED.client_id),
    last_message_at = GREATEST(public.conversations.last_message_at, EXCLUDED.last_message_at),
    unread_count = public.conversations.unread_count + 1,
    updated_at = now()
  RETURNING id INTO conversation_id;

  INSERT INTO public.conversation_participants (
    conversation_id,
    role,
    display_name,
    email,
    created_at
  )
  VALUES (
    conversation_id,
    'client',
    NEW.from_address,
    normalized_email,
    now()
  )
  ON CONFLICT (conversation_id, email)
  DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, public.conversation_participants.display_name)
  RETURNING id INTO participant_id;

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
    conversation_id,
    participant_id,
    'inbound',
    NEW.text_body,
    NEW.html_body,
    NEW.message_id,
    COALESCE(NEW.received_at, NEW.sent_at, now()),
    'received',
    now()
  )
  ON CONFLICT (conversation_id, external_message_id)
  DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_inbox_email_to_unified_inbox ON public.inbox_emails;
CREATE TRIGGER trg_sync_inbox_email_to_unified_inbox
AFTER INSERT ON public.inbox_emails
FOR EACH ROW
EXECUTE FUNCTION public.sync_inbox_email_to_unified_inbox();