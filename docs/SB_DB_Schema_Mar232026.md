-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public._backup_user_roles (
  id uuid NOT NULL,
  role ARRAY,
  CONSTRAINT _backup_user_roles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.activity_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  entity_id uuid NOT NULL,
  entity_type USER-DEFINED NOT NULL,
  action text NOT NULL,
  details text,
  created_by text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT activity_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.automation_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  workflow_id uuid NOT NULL,
  triggered_at timestamp without time zone NOT NULL,
  status text NOT NULL,
  details text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT automation_logs_pkey PRIMARY KEY (id),
  CONSTRAINT automation_logs_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflows(id)
);
CREATE TABLE public.branding_settings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  company_name text NOT NULL,
  logo_url text,
  primary_color text NOT NULL,
  secondary_color text NOT NULL,
  accent_color text NOT NULL,
  theme_mode USER-DEFINED NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  address text,
  email text,
  website text,
  phone text,
  instagram text,
  facebook text,
  tiktok text,
  latitude numeric,
  longitude numeric,
  CONSTRAINT branding_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.calendar_settings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  timezone text NOT NULL,
  week_start_day text NOT NULL,
  working_hours jsonb,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT calendar_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.client_files (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  url text NOT NULL,
  type text NOT NULL,
  size numeric NOT NULL,
  uploaded_by text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT client_files_pkey PRIMARY KEY (id),
  CONSTRAINT client_files_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id)
);
CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  company_name text,
  address text,
  city text,
  state text,
  zip_code text,
  country text,
  role text,
  type USER-DEFINED,
  lead_source USER-DEFINED,
  instagram text,
  facebook text,
  notes text,
  portal_access boolean DEFAULT false,
  portal_last_login timestamp without time zone,
  portal_settings jsonb,
  created_at timestamp without time zone DEFAULT now(),
  job_title text,
  phone_office text,
  relationship text,
  auth_user_id uuid,
  CONSTRAINT clients_pkey PRIMARY KEY (id)
);
CREATE TABLE public.contact_forms (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  fields jsonb NOT NULL,
  settings jsonb,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT contact_forms_pkey PRIMARY KEY (id)
);
CREATE TABLE public.contact_identities (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['email'::text, 'phone'::text, 'facebook'::text, 'instagram'::text])),
  value text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT contact_identities_pkey PRIMARY KEY (id),
  CONSTRAINT contact_identities_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id)
);
CREATE TABLE public.contracts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL,
  event_id uuid NOT NULL,
  content text NOT NULL,
  status text NOT NULL,
  signed_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  quote_id uuid,
  template_id uuid,
  signed_by text,
  signature_metadata jsonb,
  document_version integer NOT NULL DEFAULT 1,
  CONSTRAINT contracts_pkey PRIMARY KEY (id),
  CONSTRAINT contracts_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT contracts_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT contracts_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id),
  CONSTRAINT contracts_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id)
);
CREATE TABLE public.conversation_messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL,
  sender_participant_id uuid,
  direction text NOT NULL CHECK (direction = ANY (ARRAY['inbound'::text, 'outbound'::text])),
  body_text text,
  body_html text,
  external_message_id text,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  delivery_status text,
  error text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT conversation_messages_pkey PRIMARY KEY (id),
  CONSTRAINT conversation_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id),
  CONSTRAINT conversation_messages_sender_participant_id_fkey FOREIGN KEY (sender_participant_id) REFERENCES public.conversation_participants(id)
);
CREATE TABLE public.conversation_participants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['client'::text, 'admin'::text, 'venue'::text, 'provider'::text, 'planner'::text, 'other'::text])),
  display_name text,
  email text,
  phone text,
  social_handle text,
  external_user_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT conversation_participants_pkey PRIMARY KEY (id),
  CONSTRAINT conversation_participants_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id)
);
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  channel text NOT NULL CHECK (channel = ANY (ARRAY['email'::text, 'facebook'::text, 'instagram'::text])),
  external_thread_id text,
  subject text,
  client_id uuid,
  status text NOT NULL DEFAULT 'open'::text CHECK (status = ANY (ARRAY['open'::text, 'pending'::text, 'closed'::text])),
  assigned_user_id uuid,
  last_message_at timestamp with time zone,
  unread_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT conversations_assigned_user_id_fkey FOREIGN KEY (assigned_user_id) REFERENCES public.users(id)
);
CREATE TABLE public.delivery_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cost_per_km numeric NOT NULL DEFAULT 0,
  base_fee numeric NOT NULL DEFAULT 0,
  free_radius_km numeric NOT NULL DEFAULT 0,
  min_fee numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  hq_address text,
  fuel_consumption numeric DEFAULT 0,
  fuel_price numeric DEFAULT 0,
  setup_time integer DEFAULT 0,
  buffer_time integer DEFAULT 0,
  CONSTRAINT delivery_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.email_settings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  smtp_config jsonb NOT NULL,
  sender_identity jsonb NOT NULL,
  signature text,
  notifications jsonb NOT NULL,
  sms_config jsonb,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT email_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.event_commissions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  event_id uuid NOT NULL,
  type text NOT NULL,
  percentage numeric DEFAULT 0,
  currency text DEFAULT 'MXN'::text,
  payment_method text,
  from_account text,
  to_account text,
  amount numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT event_commissions_pkey PRIMARY KEY (id),
  CONSTRAINT event_commissions_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
);
CREATE TABLE public.event_expenses (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  event_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  amount_usd numeric DEFAULT 0,
  amount_mxn numeric DEFAULT 0,
  category_id uuid,
  date date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT event_expenses_pkey PRIMARY KEY (id),
  CONSTRAINT event_expenses_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT event_expenses_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.expense_categories(id)
);
CREATE TABLE public.event_fiscal_details (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  event_id uuid NOT NULL UNIQUE,
  date_required date,
  currency text DEFAULT 'MXN'::text,
  link_pdf text,
  date_requested date,
  exchange_rate numeric DEFAULT 1,
  link_xml text,
  date_submitted date,
  folio text,
  subtotal numeric DEFAULT 0,
  iva numeric DEFAULT 0,
  isr numeric DEFAULT 0,
  iva_ret numeric DEFAULT 0,
  isr_ret numeric DEFAULT 0,
  total numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT event_fiscal_details_pkey PRIMARY KEY (id),
  CONSTRAINT event_fiscal_details_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
);
CREATE TABLE public.event_staff_assignments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  event_id uuid,
  staff_id uuid,
  role text NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'declined'::text, 'completed'::text])),
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  hours_worked numeric,
  pay_rate numeric DEFAULT 0,
  pay_type text DEFAULT 'flat'::text CHECK (pay_type = ANY (ARRAY['hourly'::text, 'flat'::text])),
  total_pay numeric,
  is_paid boolean DEFAULT false,
  paid_at timestamp with time zone,
  payroll_run_id uuid,
  payment_reference text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  payment_method text,
  from_account text,
  to_account text,
  pay_rate_id uuid,
  compensation_config jsonb,
  CONSTRAINT event_staff_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT event_staff_assignments_payroll_run_id_fkey FOREIGN KEY (payroll_run_id) REFERENCES public.payroll_runs(id),
  CONSTRAINT event_staff_assignments_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT event_staff_assignments_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.users(id),
  CONSTRAINT event_staff_assignments_pay_rate_id_fkey FOREIGN KEY (pay_rate_id) REFERENCES public.staff_pay_rates(id)
);
CREATE TABLE public.event_timeline_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  event_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  offset_minutes integer NOT NULL,
  icon USER-DEFINED NOT NULL,
  is_anchor boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT event_timeline_items_pkey PRIMARY KEY (id),
  CONSTRAINT event_timeline_items_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
);
CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  date date NOT NULL,
  client_id uuid NOT NULL,
  venue_id uuid,
  planner_id uuid,
  status USER-DEFINED NOT NULL,
  guest_count integer,
  budget numeric,
  notes text,
  created_at timestamp without time zone DEFAULT now(),
  venue_name text,
  services ARRAY,
  secondary_client_id uuid,
  hashtag text,
  event_type text,
  dietary_restrictions text,
  meet_load_time time without time zone,
  leave_time time without time zone,
  arrive_venue_time time without time zone,
  setup_time time without time zone,
  start_time time without time zone,
  end_time time without time zone,
  venue_contact_id uuid,
  day_of_contact_name text,
  day_of_contact_phone text,
  venue_sub_location text,
  venue_contact_name text,
  venue_contact_phone text,
  venue_contact_email text,
  planner_company text,
  planner_name text,
  planner_phone text,
  planner_email text,
  planner_instagram text,
  type text,
  venue_address text,
  planner_first_name text,
  planner_last_name text,
  CONSTRAINT events_pkey PRIMARY KEY (id),
  CONSTRAINT events_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.venues(id),
  CONSTRAINT events_planner_id_fkey FOREIGN KEY (planner_id) REFERENCES public.planners(id),
  CONSTRAINT events_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT events_secondary_client_id_fkey FOREIGN KEY (secondary_client_id) REFERENCES public.clients(id),
  CONSTRAINT events_venue_contact_id_fkey FOREIGN KEY (venue_contact_id) REFERENCES public.venue_contacts(id)
);
CREATE TABLE public.expense_categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  color text,
  parent_id uuid,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT expense_categories_pkey PRIMARY KEY (id),
  CONSTRAINT expense_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.expense_categories(id)
);
CREATE TABLE public.financial_settings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  currency USER-DEFINED NOT NULL,
  tax_rate numeric NOT NULL,
  invoice_sequence_prefix text,
  invoice_sequence_start integer,
  created_at timestamp without time zone DEFAULT now(),
  quote_sequence_prefix text DEFAULT 'QTE'::text,
  contract_sequence_prefix text DEFAULT 'CON'::text,
  questionnaire_sequence_prefix text DEFAULT 'QUE'::text,
  CONSTRAINT financial_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.inbox_emails (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  message_id text NOT NULL,
  from_address text NOT NULL,
  to_address text NOT NULL,
  cc_address text,
  subject text,
  sent_at timestamp without time zone,
  received_at timestamp without time zone DEFAULT now(),
  text_body text,
  html_body text,
  source text DEFAULT 'zoho'::text,
  status text DEFAULT 'unread'::text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT inbox_emails_pkey PRIMARY KEY (id)
);
CREATE TABLE public.invoice_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  invoice_id uuid NOT NULL,
  description text,
  quantity numeric,
  unit_price numeric,
  total numeric,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT invoice_items_pkey PRIMARY KEY (id),
  CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id)
);
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL,
  event_id uuid NOT NULL,
  invoice_number text NOT NULL,
  items jsonb NOT NULL,
  total_amount numeric NOT NULL,
  status USER-DEFINED NOT NULL,
  due_date date NOT NULL,
  type USER-DEFINED NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  quote_id uuid,
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT invoices_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT invoices_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id)
);
CREATE TABLE public.leads (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  role USER-DEFINED,
  event_type text,
  event_date date,
  guest_count integer,
  venue_name text,
  services_interested ARRAY,
  notes text,
  lead_source USER-DEFINED,
  status USER-DEFINED NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT leads_pkey PRIMARY KEY (id)
);
CREATE TABLE public.message_attachments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  message_id uuid NOT NULL,
  storage_path text,
  filename text NOT NULL,
  mime_type text,
  size_bytes bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT message_attachments_pkey PRIMARY KEY (id),
  CONSTRAINT message_attachments_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.conversation_messages(id)
);
CREATE TABLE public.notes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  entity_id uuid NOT NULL,
  entity_type USER-DEFINED NOT NULL,
  content text NOT NULL,
  created_by text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT notes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.payment_methods (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  type text NOT NULL,
  details jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT payment_methods_pkey PRIMARY KEY (id)
);
CREATE TABLE public.payment_schedules (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  milestones jsonb NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT payment_schedules_pkey PRIMARY KEY (id)
);
CREATE TABLE public.payroll_runs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  period_start date NOT NULL,
  period_end date NOT NULL,
  payment_date date NOT NULL,
  total_amount numeric DEFAULT 0,
  status text DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'processed'::text, 'paid'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payroll_runs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.planners (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  company text,
  email text NOT NULL,
  phone text,
  website text,
  instagram text,
  facebook text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT planners_pkey PRIMARY KEY (id)
);
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  category text NOT NULL,
  cost numeric NOT NULL,
  price_direct numeric NOT NULL,
  price_pv numeric NOT NULL,
  is_active boolean DEFAULT true,
  unit text,
  image_url text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT products_pkey PRIMARY KEY (id)
);
CREATE TABLE public.questionnaires (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL,
  event_id uuid NOT NULL,
  title text NOT NULL,
  status text NOT NULL,
  answers jsonb,
  created_at timestamp without time zone DEFAULT now(),
  quote_id uuid,
  template_id uuid,
  CONSTRAINT questionnaires_pkey PRIMARY KEY (id),
  CONSTRAINT questionnaires_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT questionnaires_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT questionnaires_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id),
  CONSTRAINT questionnaires_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id)
);
CREATE TABLE public.quotes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL,
  event_id uuid NOT NULL,
  items jsonb NOT NULL,
  total_amount numeric NOT NULL,
  currency USER-DEFINED NOT NULL,
  exchange_rate numeric NOT NULL,
  questionnaire_template_id uuid,
  contract_template_id uuid,
  payment_plan_template_id uuid,
  status USER-DEFINED NOT NULL,
  valid_until date NOT NULL,
  version integer NOT NULL DEFAULT 1,
  parent_quote_id uuid,
  created_at timestamp without time zone DEFAULT now(),
  taxes jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT quotes_pkey PRIMARY KEY (id),
  CONSTRAINT quotes_questionnaire_template_id_fkey FOREIGN KEY (questionnaire_template_id) REFERENCES public.templates(id),
  CONSTRAINT quotes_contract_template_id_fkey FOREIGN KEY (contract_template_id) REFERENCES public.templates(id),
  CONSTRAINT quotes_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT quotes_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT quotes_parent_quote_id_fkey FOREIGN KEY (parent_quote_id) REFERENCES public.quotes(id)
);
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL,
  event_id uuid NOT NULL,
  rating integer NOT NULL,
  comment text NOT NULL,
  status USER-DEFINED NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT reviews_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
);
CREATE TABLE public.roles (
  id text NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  is_system boolean NOT NULL,
  permissions jsonb NOT NULL,
  field_security jsonb NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT roles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.run_sheets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL UNIQUE,
  event_start_time text,
  event_end_time text,
  meet_load_time text,
  leave_time text,
  arrive_time text,
  setup_time text,
  driver_a text,
  driver_b text,
  operator_1 text,
  operator_2 text,
  operator_3 text,
  operator_4 text,
  operator_5 text,
  operator_6 text,
  cart_1 boolean DEFAULT false,
  cart_2 boolean DEFAULT false,
  booth_1 boolean DEFAULT false,
  booth_2 boolean DEFAULT false,
  freezer_1 boolean DEFAULT false,
  freezer_2 boolean DEFAULT false,
  rollz_1 boolean DEFAULT false,
  pancake_1 boolean DEFAULT false,
  pancake_2 boolean DEFAULT false,
  waffle_1 boolean DEFAULT false,
  waffle_2 boolean DEFAULT false,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT run_sheets_pkey PRIMARY KEY (id),
  CONSTRAINT run_sheets_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
);
CREATE TABLE public.social_integrations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  platform text NOT NULL CHECK (platform = ANY (ARRAY['facebook'::text, 'instagram'::text])),
  page_id text NOT NULL,
  page_name text,
  access_token text NOT NULL,
  webhook_secret text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT social_integrations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.staff_pay_rates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  position_key text NOT NULL UNIQUE,
  position_label text NOT NULL,
  rate_type text NOT NULL CHECK (rate_type = ANY (ARRAY['flat'::text, 'per_direction'::text, 'percent_revenue'::text, 'tiered_hours'::text, 'tiered_quantity'::text])),
  config jsonb NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT staff_pay_rates_pkey PRIMARY KEY (id)
);
CREATE TABLE public.staff_profiles (
  user_id uuid NOT NULL,
  first_name text,
  last_name text,
  phone text,
  address text,
  date_of_birth date,
  id_type text CHECK (id_type = ANY (ARRAY['INE'::text, 'Passport'::text, 'Driver License'::text, 'Other'::text])),
  id_number text,
  id_expiration_date date,
  id_front_url text,
  id_back_url text,
  is_driver boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  bank_name text,
  card_number text,
  clabe text,
  account_number text,
  CONSTRAINT staff_profiles_pkey PRIMARY KEY (user_id),
  CONSTRAINT staff_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.task_templates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  category text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT task_templates_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid,
  title text NOT NULL,
  description text,
  status USER-DEFINED NOT NULL,
  due_date date,
  completed_at timestamp without time zone,
  completed_by text,
  created_at timestamp without time zone DEFAULT now(),
  venue_id uuid,
  planner_id uuid,
  assigned_to uuid,
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT tasks_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.venues(id),
  CONSTRAINT tasks_planner_id_fkey FOREIGN KEY (planner_id) REFERENCES public.planners(id),
  CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id)
);
CREATE TABLE public.templates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  type USER-DEFINED NOT NULL,
  subject text,
  content text,
  questions jsonb,
  is_active boolean DEFAULT true,
  last_modified timestamp without time zone DEFAULT now(),
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT templates_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tokens (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  default_value text,
  category text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT tokens_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  device text NOT NULL,
  ip_address text NOT NULL,
  location text,
  last_active timestamp without time zone NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT user_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role ARRAY NOT NULL DEFAULT ARRAY['staff'::text],
  status USER-DEFINED NOT NULL,
  last_login timestamp without time zone,
  security_config jsonb,
  created_at timestamp without time zone DEFAULT now(),
  auth_user_id uuid,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.venue_contacts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  venue_id uuid NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  role text NOT NULL,
  email text NOT NULL,
  phone text,
  is_primary boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT venue_contacts_pkey PRIMARY KEY (id),
  CONSTRAINT venue_contacts_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.venues(id)
);
CREATE TABLE public.venues (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  address text NOT NULL,
  email text,
  phone text,
  venue_area USER-DEFINED,
  city text,
  state text,
  zip_code text,
  country text,
  website text,
  instagram text,
  facebook text,
  notes text,
  created_at timestamp without time zone DEFAULT now(),
  google_place_id text,
  latitude numeric,
  longitude numeric,
  travel_distance_km numeric,
  travel_time_mins integer,
  map_url text,
  flete_fee numeric DEFAULT 0,
  is_preferred boolean DEFAULT false,
  CONSTRAINT venues_pkey PRIMARY KEY (id)
);
CREATE TABLE public.workflows (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  active boolean NOT NULL,
  trigger text NOT NULL,
  actions jsonb NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  conditions jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT workflows_pkey PRIMARY KEY (id)
);