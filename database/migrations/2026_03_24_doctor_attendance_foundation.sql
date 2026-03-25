-- Doctor Attendance Foundation

CREATE TABLE IF NOT EXISTS public.doctor_attendance (
  attendance_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id integer NOT NULL REFERENCES public.doctor(doctor_id) ON DELETE CASCADE,
  date date NOT NULL,
  check_in_time timestamp without time zone,
  check_out_time timestamp without time zone,
  status varchar(20) NOT NULL DEFAULT 'Present',
  marked_by varchar(50),
  admin_id integer REFERENCES public.staff(staff_id),
  roster_id bigint REFERENCES public.staff_roster_assignments(roster_id) ON DELETE SET NULL,
  shift_code varchar(50),
  check_in_source varchar(40),
  check_out_source varchar(40),
  late_minutes integer NOT NULL DEFAULT 0,
  early_leave_minutes integer NOT NULL DEFAULT 0,
  overtime_minutes integer NOT NULL DEFAULT 0,
  break_minutes integer NOT NULL DEFAULT 0,
  attendance_notes text,
  derived_status varchar(30) NOT NULL DEFAULT 'unscheduled',
  is_unscheduled boolean NOT NULL DEFAULT true,
  is_on_time boolean NOT NULL DEFAULT false,
  policy_snapshot jsonb,
  UNIQUE (doctor_id, date)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'doctor_attendance_derived_status_check'
      AND conrelid = 'public.doctor_attendance'::regclass
  ) THEN
    ALTER TABLE public.doctor_attendance
      ADD CONSTRAINT doctor_attendance_derived_status_check
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

CREATE INDEX IF NOT EXISTS idx_doctor_attendance_date_derived_status
  ON public.doctor_attendance (date, derived_status);

CREATE INDEX IF NOT EXISTS idx_doctor_attendance_doctor_date
  ON public.doctor_attendance (doctor_id, date DESC);
