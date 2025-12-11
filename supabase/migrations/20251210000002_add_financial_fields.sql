-- Add missing sequence prefix columns to financial_settings
ALTER TABLE financial_settings 
ADD COLUMN IF NOT EXISTS quote_sequence_prefix TEXT DEFAULT 'QTE',
ADD COLUMN IF NOT EXISTS contract_sequence_prefix TEXT DEFAULT 'CON',
ADD COLUMN IF NOT EXISTS questionnaire_sequence_prefix TEXT DEFAULT 'QUE';
