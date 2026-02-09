-- Add Google Maps related columns to venues table
ALTER TABLE venues
ADD COLUMN google_place_id TEXT,
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8),
ADD COLUMN travel_distance_km DECIMAL(10, 2),
ADD COLUMN travel_time_mins INTEGER,
ADD COLUMN map_url TEXT;
