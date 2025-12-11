-- 1. Client Updates
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS phone_office TEXT,
ADD COLUMN IF NOT EXISTS relationship TEXT; -- e.g. "Groom", "Assistant"

-- 2. Event Updates
ALTER TABLE events
ADD COLUMN IF NOT EXISTS hashtag TEXT,
ADD COLUMN IF NOT EXISTS event_type TEXT, -- Wedding, Social, Corporate, etc.
ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT, -- Summary list
-- Key Timeline Milestones
ADD COLUMN IF NOT EXISTS meet_load_time TIME,
ADD COLUMN IF NOT EXISTS leave_time TIME,
ADD COLUMN IF NOT EXISTS arrive_venue_time TIME,
ADD COLUMN IF NOT EXISTS setup_time TIME,
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME;

-- 3. Venue Contact Link on Event
-- This allows selecting a specific contact from the venue_contacts table for this event
ALTER TABLE events
ADD COLUMN IF NOT EXISTS venue_contact_id UUID REFERENCES venue_contacts(id) ON DELETE SET NULL;

-- 4. Day-of Coordinator on Event
-- Simple text fields for now, as they might be external to the system
ALTER TABLE events
ADD COLUMN IF NOT EXISTS day_of_contact_name TEXT,
ADD COLUMN IF NOT EXISTS day_of_contact_phone TEXT;

-- 5. Questionnaire Support Fields (Events)
ALTER TABLE events
ADD COLUMN IF NOT EXISTS venue_sub_location TEXT,
ADD COLUMN IF NOT EXISTS venue_contact_name TEXT,
ADD COLUMN IF NOT EXISTS venue_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS venue_contact_email TEXT,
ADD COLUMN IF NOT EXISTS planner_company TEXT,
ADD COLUMN IF NOT EXISTS planner_name TEXT,
ADD COLUMN IF NOT EXISTS planner_phone TEXT,
ADD COLUMN IF NOT EXISTS planner_email TEXT,
ADD COLUMN IF NOT EXISTS planner_instagram TEXT;

-- Comments for clarity
COMMENT ON COLUMN clients.phone_office IS 'Secondary office phone number';
COMMENT ON COLUMN events.venue_contact_id IS 'Specific contact person at the venue for this event';
