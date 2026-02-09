create extension if not exists moddatetime schema extensions;

create table if not exists public.run_sheets (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references public.events(id) on delete cascade not null unique,
  
  -- Schedule
  event_start_time text,
  event_end_time text,
  meet_load_time text,
  leave_time text,
  arrive_time text,
  setup_time text,
  
  -- Staff
  driver_a text,
  driver_b text,
  operator_1 text,
  operator_2 text,
  operator_3 text,
  operator_4 text,
  operator_5 text,
  operator_6 text,
  
  -- Equipment (Booleans)
  cart_1 boolean default false,
  cart_2 boolean default false,
  booth_1 boolean default false,
  booth_2 boolean default false,
  freezer_1 boolean default false,
  freezer_2 boolean default false,
  rollz_1 boolean default false,
  pancake_1 boolean default false,
  pancake_2 boolean default false,
  waffle_1 boolean default false,
  waffle_2 boolean default false,
  
  -- Additional Info
  notes text,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.run_sheets enable row level security;

-- Policies
create policy "Enable read access for authenticated users"
  on public.run_sheets for select
  to authenticated
  using (true);

create policy "Enable insert access for authenticated users"
  on public.run_sheets for insert
  to authenticated
  with check (true);

create policy "Enable update access for authenticated users"
  on public.run_sheets for update
  to authenticated
  using (true);

create policy "Enable delete access for authenticated users"
  on public.run_sheets for delete
  to authenticated
  using (true);

-- Trigger for updated_at
create trigger handle_updated_at before update on public.run_sheets
  for each row execute procedure moddatetime (updated_at);
