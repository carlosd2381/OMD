alter table public.quotes
  add column if not exists taxes jsonb default '[]'::jsonb;

comment on column public.quotes.taxes is 'Array of tax entries { name, rate, amount, is_retention } stored in MXN.';
