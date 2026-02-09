-- Create delivery_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS delivery_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cost_per_km NUMERIC DEFAULT 0,
  base_fee NUMERIC DEFAULT 0,
  free_radius_km NUMERIC DEFAULT 0,
  min_fee NUMERIC DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add new columns to delivery_settings table
ALTER TABLE delivery_settings
ADD COLUMN IF NOT EXISTS hq_address text,
ADD COLUMN IF NOT EXISTS fuel_consumption numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS fuel_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS setup_time integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS buffer_time integer DEFAULT 0;

-- Update comment
COMMENT ON TABLE delivery_settings IS 'Stores delivery and logistics configuration including travel calculation parameters';
