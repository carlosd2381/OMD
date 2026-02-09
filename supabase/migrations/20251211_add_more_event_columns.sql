-- Add remaining missing columns to the events table to support the booking questionnaire
-- These fields allow storing venue/planner details directly on the event when no linked entity exists
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS venue_address text,
ADD COLUMN IF NOT EXISTS venue_contact_name text,
ADD COLUMN IF NOT EXISTS venue_contact_email text,
ADD COLUMN IF NOT EXISTS venue_contact_phone text,
ADD COLUMN IF NOT EXISTS planner_company text,
ADD COLUMN IF NOT EXISTS planner_first_name text,
ADD COLUMN IF NOT EXISTS planner_last_name text,
ADD COLUMN IF NOT EXISTS planner_email text,
ADD COLUMN IF NOT EXISTS planner_phone text,
ADD COLUMN IF NOT EXISTS planner_instagram text;
