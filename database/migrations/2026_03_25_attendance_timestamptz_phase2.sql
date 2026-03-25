-- Stage 2 follow-up: normalize attendance time columns to timestamptz.
-- Existing values are interpreted as UTC instants.

ALTER TABLE IF EXISTS public.staff_attendance
  ALTER COLUMN check_in_time TYPE timestamptz
    USING CASE
      WHEN check_in_time IS NULL THEN NULL
      ELSE check_in_time AT TIME ZONE 'UTC'
    END,
  ALTER COLUMN check_out_time TYPE timestamptz
    USING CASE
      WHEN check_out_time IS NULL THEN NULL
      ELSE check_out_time AT TIME ZONE 'UTC'
    END;

ALTER TABLE IF EXISTS public.doctor_attendance
  ALTER COLUMN check_in_time TYPE timestamptz
    USING CASE
      WHEN check_in_time IS NULL THEN NULL
      ELSE check_in_time AT TIME ZONE 'UTC'
    END,
  ALTER COLUMN check_out_time TYPE timestamptz
    USING CASE
      WHEN check_out_time IS NULL THEN NULL
      ELSE check_out_time AT TIME ZONE 'UTC'
    END;
