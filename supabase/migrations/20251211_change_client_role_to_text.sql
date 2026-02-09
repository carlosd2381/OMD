-- Convert client role from enum to text to allow free input in the questionnaire
-- This prevents errors if the user types a role that isn't in the strict predefined list (e.g. "Mother of the Bride")

ALTER TABLE public.clients ALTER COLUMN role TYPE text;

-- Optional: Drop the enum type if it's no longer needed
-- DROP TYPE IF EXISTS client_role;
