-- Add secondary_client_id to events table
ALTER TABLE events 
ADD COLUMN secondary_client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Comment on column
COMMENT ON COLUMN events.secondary_client_id IS 'Optional secondary client (e.g. Groom, Partner) for the event';
