-- Add type column to invoices table if it doesn't exist
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'standard';
