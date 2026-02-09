-- Change FK on event_staff_assignments.staff_id to reference public.users(id)
-- Backup existing constraint (if any) and recreate

ALTER TABLE event_staff_assignments DROP CONSTRAINT IF EXISTS event_staff_assignments_staff_id_fkey;

ALTER TABLE event_staff_assignments
  ADD CONSTRAINT event_staff_assignments_staff_id_fkey
  FOREIGN KEY (staff_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Optional: reindex to ensure constraint checks are fast
REINDEX TABLE event_staff_assignments;

-- Confirm: list first 5 rows joining to public.users
SELECT a.id, a.event_id, a.staff_id, u.email
FROM event_staff_assignments a
LEFT JOIN public.users u ON u.id = a.staff_id
LIMIT 10;