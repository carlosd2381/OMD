-- Insert System Questionnaire Template with a fixed UUID
-- This allows us to reference it in the code while satisfying the UUID type constraint in the database
INSERT INTO templates (id, name, type, content, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'System: New Booking Questionnaire',
  'questionnaire',
  '{}',
  true
) ON CONFLICT (id) DO NOTHING;
