-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'staff');
CREATE TYPE user_status AS ENUM ('active', 'pending', 'deactivated');
CREATE TYPE client_role AS ENUM ('Bride', 'Groom', 'Parent', 'External Planner', 'Hotel/Resort', 'Private Venue');
CREATE TYPE client_type AS ENUM ('Direct', 'Preferred Vendor');
CREATE TYPE lead_source AS ENUM ('Website', 'Facebook', 'Facebook Group', 'Instagram', 'TikTok', 'External Planner', 'Hotel/Venue', 'Hotel/Venue PV', 'Vendor Referral', 'Client Referral', 'Other');
CREATE TYPE venue_area AS ENUM ('Playa/Costa Mujeres', 'Cancun Z/H', 'Cancun', 'Puerto Morelos', 'Playa Del Carmen', 'Puerto Aventuras', 'Akumal', 'Tulum', 'Isla Mujeres', 'Cozumel', 'Other');
CREATE TYPE event_status AS ENUM ('inquiry', 'confirmed', 'completed', 'cancelled');
CREATE TYPE lead_status AS ENUM ('New', 'Contacted', 'Qualified', 'Converted', 'Lost');
CREATE TYPE quote_status AS ENUM ('draft', 'sent', 'accepted', 'rejected');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
CREATE TYPE invoice_type AS ENUM ('retainer', 'standard', 'change_order', 'final_balance');
CREATE TYPE task_status AS ENUM ('pending', 'completed');
CREATE TYPE review_status AS ENUM ('pending', 'submitted');
CREATE TYPE theme_mode AS ENUM ('light', 'dark', 'system');
CREATE TYPE currency_code AS ENUM ('MXN', 'USD', 'GBP', 'EUR', 'CAD');
CREATE TYPE template_type AS ENUM ('email', 'contract', 'invoice', 'quote', 'questionnaire');
CREATE TYPE timeline_icon AS ENUM ('package', 'car', 'pin', 'wrench', 'party', 'flag');
CREATE TYPE entity_type AS ENUM ('client', 'event', 'venue', 'planner', 'lead');

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL,
  status user_status NOT NULL,
  last_login TIMESTAMP,
  security_config JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User Sessions
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  device TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  location TEXT,
  last_active TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Clients
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL, -- Unique constraint might be needed but email can be shared? Doc says "Unique identifier often used for lookup"
  phone TEXT,
  company_name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT,
  role client_role,
  type client_type,
  lead_source lead_source,
  instagram TEXT,
  facebook TEXT,
  notes TEXT,
  portal_access BOOLEAN DEFAULT FALSE,
  portal_last_login TIMESTAMP,
  portal_settings JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Venues
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  venue_area venue_area,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT,
  website TEXT,
  instagram TEXT,
  facebook TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Venue Contacts
CREATE TABLE venue_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID NOT NULL REFERENCES venues(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Planners
CREATE TABLE planners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  instagram TEXT,
  facebook TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Leads
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role client_role,
  event_type TEXT, -- Enum not defined in doc for event_type in leads, using TEXT or maybe create one
  event_date DATE,
  guest_count INTEGER,
  venue_name TEXT,
  services_interested TEXT[],
  notes TEXT,
  lead_source lead_source,
  status lead_status NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Events
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  client_id UUID NOT NULL REFERENCES clients(id),
  venue_id UUID REFERENCES venues(id),
  planner_id UUID REFERENCES planners(id),
  status event_status NOT NULL,
  guest_count INTEGER,
  budget NUMERIC,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Event Timeline Items
CREATE TABLE event_timeline_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id),
  title TEXT NOT NULL,
  description TEXT,
  offset_minutes INTEGER NOT NULL,
  icon timeline_icon NOT NULL,
  is_anchor BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  cost NUMERIC NOT NULL,
  price_direct NUMERIC NOT NULL,
  price_pv NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  unit TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Templates
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type template_type NOT NULL,
  subject TEXT,
  content TEXT,
  questions JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  last_modified TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Questionnaires
CREATE TABLE questionnaires (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  event_id UUID NOT NULL REFERENCES events(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL, -- pending, completed (using TEXT as enum not strictly defined for this status in doc, or reuse task_status?) Doc says "pending, completed"
  answers JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Contracts
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  event_id UUID NOT NULL REFERENCES events(id),
  content TEXT NOT NULL,
  status TEXT NOT NULL, -- draft, sent, signed
  signed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Quotes
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  event_id UUID NOT NULL REFERENCES events(id),
  items JSONB NOT NULL,
  total_amount NUMERIC NOT NULL,
  currency currency_code NOT NULL,
  exchange_rate NUMERIC NOT NULL,
  questionnaire_template_id UUID REFERENCES templates(id),
  contract_template_id UUID REFERENCES templates(id),
  payment_plan_template_id UUID, -- No table for payment plan templates yet?
  status quote_status NOT NULL,
  valid_until DATE NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  parent_quote_id UUID REFERENCES quotes(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  event_id UUID NOT NULL REFERENCES events(id),
  invoice_number TEXT NOT NULL,
  items JSONB NOT NULL,
  total_amount NUMERIC NOT NULL,
  status invoice_status NOT NULL,
  due_date DATE NOT NULL,
  type invoice_type NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Invoice Items (Line Items)
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  description TEXT,
  quantity NUMERIC,
  unit_price NUMERIC,
  total NUMERIC,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL,
  due_date DATE,
  completed_at TIMESTAMP,
  completed_by TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Task Templates
CREATE TABLE task_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Client Files
CREATE TABLE client_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  name TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  type TEXT NOT NULL,
  size NUMERIC NOT NULL,
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id),
  event_id UUID NOT NULL REFERENCES events(id),
  rating INTEGER NOT NULL,
  comment TEXT NOT NULL,
  status review_status NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Branding Settings
CREATE TABLE branding_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT NOT NULL,
  secondary_color TEXT NOT NULL,
  accent_color TEXT NOT NULL,
  theme_mode theme_mode NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Calendar Settings
CREATE TABLE calendar_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timezone TEXT NOT NULL,
  week_start_day TEXT NOT NULL,
  working_hours JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Financial Settings
CREATE TABLE financial_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  currency currency_code NOT NULL,
  tax_rate NUMERIC NOT NULL,
  invoice_sequence_prefix TEXT,
  invoice_sequence_start INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payment Methods
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  details JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payment Schedules
CREATE TABLE payment_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  milestones JSONB NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Contact Forms
CREATE TABLE contact_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  fields JSONB NOT NULL,
  settings JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Expense Categories
CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  color TEXT,
  parent_id UUID REFERENCES expense_categories(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tokens
CREATE TABLE tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  default_value TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Email Settings
CREATE TABLE email_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  smtp_config JSONB NOT NULL,
  sender_identity JSONB NOT NULL,
  signature TEXT,
  notifications JSONB NOT NULL,
  sms_config JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Workflows (Automations)
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL,
  trigger TEXT NOT NULL,
  actions JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Automation Logs
CREATE TABLE automation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id),
  triggered_at TIMESTAMP NOT NULL,
  status TEXT NOT NULL, -- success, failed
  details TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Roles
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL,
  permissions JSONB NOT NULL,
  field_security JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notes (Polymorphic)
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL,
  entity_type entity_type NOT NULL,
  content TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Activity Logs (Polymorphic)
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL,
  entity_type entity_type NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
