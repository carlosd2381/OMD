-- Drop policies that depend on the role column
DROP POLICY IF EXISTS "Admins and Managers can manage payroll runs" ON payroll_runs;
DROP POLICY IF EXISTS "Admins can manage social integrations" ON social_integrations;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Staff can view their own assignments" ON event_staff_assignments;
DROP POLICY IF EXISTS "Admins and Managers can manage assignments" ON event_staff_assignments;

-- Drop foreign key constraint if it exists
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_fkey;

-- Drop default value first to avoid casting errors
ALTER TABLE users ALTER COLUMN role DROP DEFAULT;

-- Change role column to array of text
ALTER TABLE users
  ALTER COLUMN role TYPE text[] USING ARRAY[role::text];

-- Set new default value
ALTER TABLE users
  ALTER COLUMN role SET DEFAULT ARRAY['staff'];

-- Create helper function to check roles without recursion
CREATE OR REPLACE FUNCTION public.has_role(required_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM users
    WHERE id = auth.uid()
    AND required_role = ANY(role)
  );
END;
$$;

-- Create helper for multiple roles (OR logic)
CREATE OR REPLACE FUNCTION public.has_any_role(required_roles text[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM users
    WHERE id = auth.uid()
    AND role && required_roles
  );
END;
$$;

-- Recreate policies with array logic using security definer functions

-- Social Integrations
CREATE POLICY "Admins can manage social integrations"
  ON social_integrations
  FOR ALL
  USING (has_role('admin'));

-- Payroll Runs
CREATE POLICY "Admins and Managers can manage payroll runs"
  ON payroll_runs
  FOR ALL
  USING (has_any_role(ARRAY['admin', 'manager']));

-- Users
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can manage all users"
  ON users FOR ALL
  USING (has_role('admin'));

-- Event Staff Assignments
CREATE POLICY "Staff can view their own assignments"
  ON event_staff_assignments FOR SELECT
  USING (auth.uid() = staff_id);

CREATE POLICY "Admins and Managers can manage assignments"
  ON event_staff_assignments FOR ALL
  USING (has_any_role(ARRAY['admin', 'manager']));
