-- Attendance Policy Foundation
-- Global clinic policy settings + derived attendance fields

INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES
  ('attendance_grace_minutes', '15', 'Grace period in minutes before marking late'),
  ('attendance_half_day_minutes', '240', 'Worked minutes threshold under which day is treated as half-day'),
  ('attendance_overtime_minutes', '30', 'Overtime threshold in minutes after shift end'),
  ('attendance_early_leave_minutes', '30', 'Early leave threshold in minutes before shift end'),
  ('attendance_timezone', '"Asia/Karachi"', 'Clinic timezone for attendance calculations'),
  ('attendance_device_api_key', '"HMS_DEVICE_KEY_CHANGE_ME"', 'Shared key for device/kiosk attendance event ingestion')
ON CONFLICT (setting_key) DO NOTHING;

ALTER TABLE public.staff_attendance
  ADD COLUMN IF NOT EXISTS roster_id bigint REFERENCES public.staff_roster_assignments(roster_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS derived_status varchar(30) NOT NULL DEFAULT 'unscheduled',
  ADD COLUMN IF NOT EXISTS is_unscheduled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_on_time boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS policy_snapshot jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'staff_attendance_derived_status_check'
      AND conrelid = 'public.staff_attendance'::regclass
  ) THEN
    ALTER TABLE public.staff_attendance
      ADD CONSTRAINT staff_attendance_derived_status_check
      CHECK (
        derived_status::text = ANY (
          ARRAY[
            'on_time',
            'late',
            'half_day',
            'early_leave',
            'overtime',
            'unscheduled',
            'absent',
            'leave'
          ]::text[]
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_staff_attendance_date_derived_status
  ON public.staff_attendance (date, derived_status);

CREATE INDEX IF NOT EXISTS idx_staff_attendance_roster_id
  ON public.staff_attendance (roster_id);
