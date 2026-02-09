-- Security prep for online testing
-- Adds auth_user_id linkage and baseline RLS policies

-- 1) Link auth users to app users/clients
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_user_id uuid;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS auth_user_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS users_auth_user_id_unique
  ON public.users (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS clients_auth_user_id_unique
  ON public.clients (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- 2) Helper functions
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.client_id_for_user()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT c.id
  FROM public.clients c
  WHERE c.auth_user_id = auth.uid()
    AND c.portal_access = true
  LIMIT 1;
$$;

-- 3) Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 4) Policies (drop if existing to allow re-run)
-- Users
DROP POLICY IF EXISTS "Staff full access to users" ON public.users;
CREATE POLICY "Staff full access to users" ON public.users
  FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Users self-link auth id" ON public.users;
CREATE POLICY "Users self-link auth id" ON public.users
  FOR UPDATE
  USING (
    auth_user_id IS NULL
    AND lower(email) = lower(auth.jwt() ->> 'email')
  )
  WITH CHECK (
    auth_user_id = auth.uid()
    AND lower(email) = lower(auth.jwt() ->> 'email')
  );

-- User sessions
DROP POLICY IF EXISTS "Staff full access to sessions" ON public.user_sessions;
CREATE POLICY "Staff full access to sessions" ON public.user_sessions
  FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Clients
DROP POLICY IF EXISTS "Staff full access to clients" ON public.clients;
CREATE POLICY "Staff full access to clients" ON public.clients
  FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Clients read own profile" ON public.clients;
CREATE POLICY "Clients read own profile" ON public.clients
  FOR SELECT
  USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Clients update own profile" ON public.clients;
CREATE POLICY "Clients update own profile" ON public.clients
  FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- Events
DROP POLICY IF EXISTS "Staff full access to events" ON public.events;
CREATE POLICY "Staff full access to events" ON public.events
  FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Clients read own events" ON public.events;
CREATE POLICY "Clients read own events" ON public.events
  FOR SELECT
  USING (client_id = public.client_id_for_user());

-- Quotes
DROP POLICY IF EXISTS "Staff full access to quotes" ON public.quotes;
CREATE POLICY "Staff full access to quotes" ON public.quotes
  FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Clients read own quotes" ON public.quotes;
CREATE POLICY "Clients read own quotes" ON public.quotes
  FOR SELECT
  USING (client_id = public.client_id_for_user());

DROP POLICY IF EXISTS "Clients update own quotes" ON public.quotes;
CREATE POLICY "Clients update own quotes" ON public.quotes
  FOR UPDATE
  USING (client_id = public.client_id_for_user())
  WITH CHECK (client_id = public.client_id_for_user());

-- Contracts
DROP POLICY IF EXISTS "Staff full access to contracts" ON public.contracts;
CREATE POLICY "Staff full access to contracts" ON public.contracts
  FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Clients read own contracts" ON public.contracts;
CREATE POLICY "Clients read own contracts" ON public.contracts
  FOR SELECT
  USING (client_id = public.client_id_for_user());

DROP POLICY IF EXISTS "Clients update own contracts" ON public.contracts;
CREATE POLICY "Clients update own contracts" ON public.contracts
  FOR UPDATE
  USING (client_id = public.client_id_for_user())
  WITH CHECK (client_id = public.client_id_for_user());

-- Invoices
DROP POLICY IF EXISTS "Staff full access to invoices" ON public.invoices;
CREATE POLICY "Staff full access to invoices" ON public.invoices
  FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Clients read own invoices" ON public.invoices;
CREATE POLICY "Clients read own invoices" ON public.invoices
  FOR SELECT
  USING (client_id = public.client_id_for_user());

DROP POLICY IF EXISTS "Clients update own invoices" ON public.invoices;
CREATE POLICY "Clients update own invoices" ON public.invoices
  FOR UPDATE
  USING (client_id = public.client_id_for_user())
  WITH CHECK (client_id = public.client_id_for_user());

-- Questionnaires
DROP POLICY IF EXISTS "Staff full access to questionnaires" ON public.questionnaires;
CREATE POLICY "Staff full access to questionnaires" ON public.questionnaires
  FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Clients read own questionnaires" ON public.questionnaires;
CREATE POLICY "Clients read own questionnaires" ON public.questionnaires
  FOR SELECT
  USING (client_id = public.client_id_for_user());

DROP POLICY IF EXISTS "Clients update own questionnaires" ON public.questionnaires;
CREATE POLICY "Clients update own questionnaires" ON public.questionnaires
  FOR UPDATE
  USING (client_id = public.client_id_for_user())
  WITH CHECK (client_id = public.client_id_for_user());

-- Client files
DROP POLICY IF EXISTS "Staff full access to client files" ON public.client_files;
CREATE POLICY "Staff full access to client files" ON public.client_files
  FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Clients read own files" ON public.client_files;
CREATE POLICY "Clients read own files" ON public.client_files
  FOR SELECT
  USING (client_id = public.client_id_for_user());

-- Notes
DROP POLICY IF EXISTS "Staff full access to notes" ON public.notes;
CREATE POLICY "Staff full access to notes" ON public.notes
  FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Activity logs
DROP POLICY IF EXISTS "Staff full access to activity logs" ON public.activity_logs;
CREATE POLICY "Staff full access to activity logs" ON public.activity_logs
  FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
