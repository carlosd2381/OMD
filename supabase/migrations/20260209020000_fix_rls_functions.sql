-- Fix RLS helper functions to avoid recursive policy evaluation timeouts

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
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
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT c.id
  FROM public.clients c
  WHERE c.auth_user_id = auth.uid()
    AND c.portal_access = true
  LIMIT 1;
$$;
