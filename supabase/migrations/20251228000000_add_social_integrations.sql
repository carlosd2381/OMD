-- Create social_integrations table
CREATE TABLE IF NOT EXISTS social_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram')),
  page_id TEXT NOT NULL,
  page_name TEXT,
  access_token TEXT NOT NULL, -- Encrypted or secure storage recommended in production
  webhook_secret TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE social_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage social integrations"
  ON social_integrations
  FOR ALL
  USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));
