-- Global system timezone governance
-- Adds authoritative system_timezone key in system_settings.

INSERT INTO public.system_settings (setting_key, setting_value, description)
SELECT
  'system_timezone',
  COALESCE(
    (SELECT setting_value FROM public.system_settings WHERE setting_key = 'attendance_timezone' LIMIT 1),
    '"Asia/Karachi"'::jsonb
  ),
  'Global HMS timezone used for business-day boundaries and date/time rendering'
ON CONFLICT (setting_key) DO UPDATE
SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  updated_at = NOW();
