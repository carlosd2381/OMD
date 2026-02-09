-- Add Company Details columns to branding_settings table
ALTER TABLE branding_settings
ADD COLUMN address TEXT,
ADD COLUMN email TEXT,
ADD COLUMN website TEXT,
ADD COLUMN phone TEXT,
ADD COLUMN instagram TEXT,
ADD COLUMN facebook TEXT,
ADD COLUMN tiktok TEXT,
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8);
