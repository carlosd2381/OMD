-- Add missing columns to the events table to support the booking questionnaire
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS type text,
ADD COLUMN IF NOT EXISTS venue_name text,
ADD COLUMN IF NOT EXISTS start_time time,
ADD COLUMN IF NOT EXISTS end_time time,
ADD COLUMN IF NOT EXISTS hashtag text,
ADD COLUMN IF NOT EXISTS day_of_contact_name text,
ADD COLUMN IF NOT EXISTS day_of_contact_phone text,
ADD COLUMN IF NOT EXISTS dietary_restrictions text,
ADD COLUMN IF NOT EXISTS meet_load_time time,
ADD COLUMN IF NOT EXISTS leave_time time,
ADD COLUMN IF NOT EXISTS arrive_venue_time time,
ADD COLUMN IF NOT EXISTS setup_time time,
ADD COLUMN IF NOT EXISTS venue_contact_id uuid REFERENCES public.venue_contacts(id);

-- Note: The 'venues' table already has a 'phone' column, so no change needed there.
-- Note: The 'clients' table 'role' column is an ENUM. If you want to allow free text, you would need to change it to text:
-- ALTER TABLE public.clients ALTER COLUMN role TYPE text;
-- DROP TYPE IF EXISTS client_role;
