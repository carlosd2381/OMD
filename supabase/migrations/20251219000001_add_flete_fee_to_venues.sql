-- Add flete_fee column to venues table
ALTER TABLE venues
ADD COLUMN IF NOT EXISTS flete_fee NUMERIC DEFAULT 0;

COMMENT ON COLUMN venues.flete_fee IS 'Calculated delivery fee for this venue';
