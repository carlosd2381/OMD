-- Add conditions column to workflows table
ALTER TABLE workflows ADD COLUMN conditions JSONB DEFAULT '{}'::jsonb;
