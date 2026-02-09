-- Backup current roles for rollback
CREATE TABLE IF NOT EXISTS public._backup_user_roles (
  id uuid PRIMARY KEY,
  role text[]
);

TRUNCATE public._backup_user_roles;
INSERT INTO public._backup_user_roles (id, role)
SELECT id, role FROM public.users;

-- Normalize role array elements by trimming braces and quotes
UPDATE public.users
SET role = (
  SELECT COALESCE(array_agg(trim(both '"' FROM trim(both '{}' FROM v))), ARRAY[]::text[])
  FROM unnest(role) AS v
);

-- Verify: return users where any element still contains braces or quotes
-- (should return 0 rows after successful normalization)
SELECT id, email, role
FROM public.users
WHERE EXISTS (
  SELECT 1 FROM unnest(role) AS v
  WHERE v LIKE '%{%' OR v LIKE '%}%' OR v LIKE '%"%'
);

-- ROLLBACK (manual):
-- UPDATE public.users u
-- SET role = b.role
-- FROM public._backup_user_roles b
-- WHERE u.id = b.id;