-- Additional RLS coverage for remaining tables

-- Enable RLS (safe to re-run)
ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_fiscal_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_timeline_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_pay_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- Staff-only access (default for back-office tables)
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'branding_settings','calendar_settings','delivery_settings','email_settings',
    'event_commissions','event_expenses','event_fiscal_details','event_staff_assignments','event_timeline_items',
    'expense_categories','financial_settings','invoice_items','payment_methods','payment_schedules','payroll_runs',
    'planners','products','reviews','roles','run_sheets','social_integrations','staff_pay_rates','staff_profiles',
    'task_templates','tasks','templates','tokens','venue_contacts','workflows','automation_logs'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Staff full access to %s" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "Staff full access to %s" ON public.%I FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());', tbl, tbl);
  END LOOP;
END $$;

-- Public contact form access
DROP POLICY IF EXISTS "Public read contact forms" ON public.contact_forms;
CREATE POLICY "Public read contact forms" ON public.contact_forms
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Staff full access to contact_forms" ON public.contact_forms;
CREATE POLICY "Staff full access to contact_forms" ON public.contact_forms
  FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Public venue list for contact form dropdowns
DROP POLICY IF EXISTS "Public read venues" ON public.venues;
CREATE POLICY "Public read venues" ON public.venues
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Staff full access to venues" ON public.venues;
CREATE POLICY "Staff full access to venues" ON public.venues
  FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Public lead creation from contact forms
DROP POLICY IF EXISTS "Public create leads" ON public.leads;
CREATE POLICY "Public create leads" ON public.leads
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Staff full access to leads" ON public.leads;
CREATE POLICY "Staff full access to leads" ON public.leads
  FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
