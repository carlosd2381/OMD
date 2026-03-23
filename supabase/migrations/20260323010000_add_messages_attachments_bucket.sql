-- Dedicated storage bucket for inbox/social messaging attachments

INSERT INTO storage.buckets (id, name, public)
VALUES ('messages-attachments', 'messages-attachments', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Staff read messages attachments" ON storage.objects;
CREATE POLICY "Staff read messages attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'messages-attachments'
  AND public.is_staff()
);

DROP POLICY IF EXISTS "Staff insert messages attachments" ON storage.objects;
CREATE POLICY "Staff insert messages attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'messages-attachments'
  AND public.is_staff()
);

DROP POLICY IF EXISTS "Staff update messages attachments" ON storage.objects;
CREATE POLICY "Staff update messages attachments"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'messages-attachments'
  AND public.is_staff()
)
WITH CHECK (
  bucket_id = 'messages-attachments'
  AND public.is_staff()
);

DROP POLICY IF EXISTS "Staff delete messages attachments" ON storage.objects;
CREATE POLICY "Staff delete messages attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'messages-attachments'
  AND public.is_staff()
);
