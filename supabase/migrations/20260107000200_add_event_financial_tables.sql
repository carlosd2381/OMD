-- Migration to add financial tables for events
CREATE TABLE IF NOT EXISTS event_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  amount_usd DECIMAL(12, 2) DEFAULT 0,
  amount_mxn DECIMAL(12, 2) DEFAULT 0,
  category_id UUID REFERENCES expense_categories(id),
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS event_commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- venue, planner, referral, etc.
  percentage DECIMAL(5, 2) DEFAULT 0,
  currency TEXT DEFAULT 'MXN',
  payment_method TEXT,
  from_account TEXT,
  to_account TEXT,
  amount DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS event_fiscal_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  date_required DATE,
  currency TEXT DEFAULT 'MXN',
  link_pdf TEXT,
  date_requested DATE,
  exchange_rate DECIMAL(12, 4) DEFAULT 1,
  link_xml TEXT,
  date_submitted DATE,
  folio TEXT,
  subtotal DECIMAL(12, 2) DEFAULT 0,
  iva DECIMAL(12, 2) DEFAULT 0,
  isr DECIMAL(12, 2) DEFAULT 0,
  iva_ret DECIMAL(12, 2) DEFAULT 0,
  isr_ret DECIMAL(12, 2) DEFAULT 0,
  total DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(event_id)
);

-- Add missing fields to event_staff_assignments
ALTER TABLE event_staff_assignments 
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS from_account TEXT,
ADD COLUMN IF NOT EXISTS to_account TEXT;

-- Enable RLS
ALTER TABLE event_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_fiscal_details ENABLE ROW LEVEL SECURITY;

-- Add RLS policies (broad for now, as per project pattern)
CREATE POLICY "Allow all on event_expenses" ON event_expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on event_commissions" ON event_commissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on event_fiscal_details" ON event_fiscal_details FOR ALL USING (true) WITH CHECK (true);
