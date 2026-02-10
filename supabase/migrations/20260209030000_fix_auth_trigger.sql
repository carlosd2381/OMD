-- Fix auth trigger to avoid failing invites and avoid creating staff rows for clients

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  existing_user_id uuid;
BEGIN
  SELECT id INTO existing_user_id
  FROM public.users
  WHERE lower(email) = lower(new.email)
  LIMIT 1;

  IF existing_user_id IS NOT NULL THEN
    UPDATE public.users
    SET auth_user_id = new.id,
        name = COALESCE(new.raw_user_meta_data->>'name', new.email),
        email = new.email
    WHERE id = existing_user_id;
  END IF;

  RETURN new;
END;
$$;
