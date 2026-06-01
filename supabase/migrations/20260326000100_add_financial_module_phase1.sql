-- Phase 1 Financial Module
-- Adds a unified payments ledger for incoming/outgoing cash tracking

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'financial_transaction_direction'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.financial_transaction_direction AS ENUM ('received', 'sent');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'financial_transaction_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.financial_transaction_status AS ENUM ('pending', 'cleared', 'failed', 'cancelled');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direction public.financial_transaction_direction NOT NULL,
  status public.financial_transaction_status NOT NULL DEFAULT 'cleared',
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency public.currency_code NOT NULL DEFAULT 'MXN',
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  reference TEXT,
  notes TEXT,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_direction_date
  ON public.financial_transactions(direction, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_invoice_id
  ON public.financial_transactions(invoice_id);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_client_id
  ON public.financial_transactions(client_id);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_event_id
  ON public.financial_transactions(event_id);

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'financial_transactions'
      AND policyname = 'Allow all on financial_transactions'
  ) THEN
    CREATE POLICY "Allow all on financial_transactions"
      ON public.financial_transactions
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
