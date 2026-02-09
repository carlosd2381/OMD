-- Drop existing policies to be safe
drop policy if exists "Enable read access for authenticated users" on public.run_sheets;
drop policy if exists "Enable insert access for authenticated users" on public.run_sheets;
drop policy if exists "Enable update access for authenticated users" on public.run_sheets;
drop policy if exists "Enable delete access for authenticated users" on public.run_sheets;

-- Create permissive policies for now (allow anon/public access)
create policy "Enable read access for all users"
  on public.run_sheets for select
  using (true);

create policy "Enable insert access for all users"
  on public.run_sheets for insert
  with check (true);

create policy "Enable update access for all users"
  on public.run_sheets for update
  using (true);

create policy "Enable delete access for all users"
  on public.run_sheets for delete
  using (true);
