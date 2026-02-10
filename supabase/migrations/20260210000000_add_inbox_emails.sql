-- Inbox emails for Zoho IMAP sync

CREATE TABLE IF NOT EXISTS public.inbox_emails (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id text NOT NULL,
  from_address text NOT NULL,
  to_address text NOT NULL,
  cc_address text,
  subject text,
  sent_at timestamp,
  received_at timestamp DEFAULT now(),
  text_body text,
  html_body text,
  source text DEFAULT 'zoho',
  status text DEFAULT 'unread',
  created_at timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS inbox_emails_message_id_key
  ON public.inbox_emails (message_id);

CREATE INDEX IF NOT EXISTS inbox_emails_sent_at_idx
  ON public.inbox_emails (sent_at);

ALTER TABLE public.inbox_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff full access to inbox emails" ON public.inbox_emails;
CREATE POLICY "Staff full access to inbox emails" ON public.inbox_emails
  FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
