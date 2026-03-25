-- Unify roster and leave references so both staff and doctors can be treated as employees.

-- =========================
-- staff_roster_assignments
-- =========================
ALTER TABLE public.staff_roster_assignments
  ADD COLUMN IF NOT EXISTS account_type varchar(20),
  ADD COLUMN IF NOT EXISTS person_id integer,
  ADD COLUMN IF NOT EXISTS doctor_id integer;

ALTER TABLE public.staff_roster_assignments
  ALTER COLUMN staff_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'staff_roster_assignments'
      AND constraint_name = 'staff_roster_assignments_doctor_id_fkey'
  ) THEN
    ALTER TABLE public.staff_roster_assignments
      ADD CONSTRAINT staff_roster_assignments_doctor_id_fkey
      FOREIGN KEY (doctor_id)
      REFERENCES public.doctor(doctor_id)
      ON DELETE CASCADE;
  END IF;
END$$;

UPDATE public.staff_roster_assignments
SET
  account_type = COALESCE(account_type, 'staff'),
  person_id = COALESCE(person_id, staff_id)
WHERE doctor_id IS NULL;

UPDATE public.staff_roster_assignments
SET
  account_type = 'doctor',
  person_id = COALESCE(person_id, doctor_id),
  staff_id = NULL
WHERE doctor_id IS NOT NULL;

ALTER TABLE public.staff_roster_assignments
  ALTER COLUMN account_type SET DEFAULT 'staff';

UPDATE public.staff_roster_assignments
SET account_type = 'staff'
WHERE account_type IS NULL;

UPDATE public.staff_roster_assignments
SET person_id = COALESCE(person_id, staff_id, doctor_id)
WHERE person_id IS NULL;

ALTER TABLE public.staff_roster_assignments
  ALTER COLUMN account_type SET NOT NULL,
  ALTER COLUMN person_id SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'staff_roster_assignments_employee_ref_check'
      AND conrelid = 'public.staff_roster_assignments'::regclass
  ) THEN
    ALTER TABLE public.staff_roster_assignments
      DROP CONSTRAINT staff_roster_assignments_employee_ref_check;
  END IF;

  ALTER TABLE public.staff_roster_assignments
    ADD CONSTRAINT staff_roster_assignments_employee_ref_check
    CHECK (
      (
        account_type = 'staff'
        AND staff_id IS NOT NULL
        AND doctor_id IS NULL
        AND person_id = staff_id
      )
      OR
      (
        account_type = 'doctor'
        AND doctor_id IS NOT NULL
        AND staff_id IS NULL
        AND person_id = doctor_id
      )
    );
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_roster_account_person_date
  ON public.staff_roster_assignments (account_type, person_id, roster_date);

CREATE INDEX IF NOT EXISTS idx_staff_roster_account_person_date
  ON public.staff_roster_assignments (account_type, person_id, roster_date DESC);


-- =========================
-- staff_leave_requests
-- =========================
ALTER TABLE public.staff_leave_requests
  ADD COLUMN IF NOT EXISTS account_type varchar(20),
  ADD COLUMN IF NOT EXISTS person_id integer,
  ADD COLUMN IF NOT EXISTS doctor_id integer;

ALTER TABLE public.staff_leave_requests
  ALTER COLUMN staff_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'staff_leave_requests'
      AND constraint_name = 'staff_leave_requests_doctor_id_fkey'
  ) THEN
    ALTER TABLE public.staff_leave_requests
      ADD CONSTRAINT staff_leave_requests_doctor_id_fkey
      FOREIGN KEY (doctor_id)
      REFERENCES public.doctor(doctor_id)
      ON DELETE CASCADE;
  END IF;
END$$;

UPDATE public.staff_leave_requests
SET
  account_type = COALESCE(account_type, 'staff'),
  person_id = COALESCE(person_id, staff_id)
WHERE doctor_id IS NULL;

UPDATE public.staff_leave_requests
SET
  account_type = 'doctor',
  person_id = COALESCE(person_id, doctor_id),
  staff_id = NULL
WHERE doctor_id IS NOT NULL;

ALTER TABLE public.staff_leave_requests
  ALTER COLUMN account_type SET DEFAULT 'staff';

UPDATE public.staff_leave_requests
SET account_type = 'staff'
WHERE account_type IS NULL;

UPDATE public.staff_leave_requests
SET person_id = COALESCE(person_id, staff_id, doctor_id)
WHERE person_id IS NULL;

ALTER TABLE public.staff_leave_requests
  ALTER COLUMN account_type SET NOT NULL,
  ALTER COLUMN person_id SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'staff_leave_requests_employee_ref_check'
      AND conrelid = 'public.staff_leave_requests'::regclass
  ) THEN
    ALTER TABLE public.staff_leave_requests
      DROP CONSTRAINT staff_leave_requests_employee_ref_check;
  END IF;

  ALTER TABLE public.staff_leave_requests
    ADD CONSTRAINT staff_leave_requests_employee_ref_check
    CHECK (
      (
        account_type = 'staff'
        AND staff_id IS NOT NULL
        AND doctor_id IS NULL
        AND person_id = staff_id
      )
      OR
      (
        account_type = 'doctor'
        AND doctor_id IS NOT NULL
        AND staff_id IS NULL
        AND person_id = doctor_id
      )
    );
END$$;

CREATE INDEX IF NOT EXISTS idx_staff_leave_requests_person_status
  ON public.staff_leave_requests (account_type, person_id, request_status, requested_at DESC);
