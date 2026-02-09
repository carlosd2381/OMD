-- Add venue_id column to tasks table
ALTER TABLE tasks 
ADD COLUMN venue_id UUID REFERENCES venues(id) ON DELETE CASCADE;

-- Make client_id nullable (since tasks can now belong to a venue instead)
ALTER TABLE tasks 
ALTER COLUMN client_id DROP NOT NULL;

-- Add an index for venue_id for better query performance
CREATE INDEX idx_tasks_venue_id ON tasks(venue_id);
