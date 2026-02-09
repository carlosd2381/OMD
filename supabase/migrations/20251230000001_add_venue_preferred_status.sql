-- Add is_preferred column to venues table
ALTER TABLE venues ADD COLUMN is_preferred BOOLEAN DEFAULT false;
