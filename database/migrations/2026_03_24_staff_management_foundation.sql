-- Staff Management Foundation (Phase 0 + Phase 1/2 schema scaffolding)

-- =========================
-- Phase 0: Staff hardening
-- =========================

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS employment_status varchar(20) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS joined_at date,
  ADD COLUMN IF NOT EXISTS exited_at date,
  ADD COLUMN IF NOT EXISTS failed_login_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_failed_login_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS account_locked_until timestamp without time zone,
  ADD COLUMN IF NOT EXISTS last_login_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS password_changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS password_reset_token varchar(128),
  ADD COLUMN IF NOT EXISTS password_reset_expires_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS mfa_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'staff_role_check'
      AND conrelid = 'public.staff'::regclass
  ) THEN
    ALTER TABLE public.staff DROP CONSTRAINT staff_role_check;
  END IF;
END $$;

ALTER TABLE public.staff
  ADD CONSTRAINT staff_role_check
  CHECK (
    role::text = ANY (
      ARRAY[
        'Receptionist',
        'Lab_Technician',
        'Admin',
        'Super Admin',
        'Cashier',
        'Pharmacist',
        'Nurse',
        'Doctor',
        'Front_Desk',
        'Billing',
        'Technician',
        'Housekeeping'
      ]::text[]
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'staff_employment_status_check'
      AND conrelid = 'public.staff'::regclass
  ) THEN
    ALTER TABLE public.staff
      ADD CONSTRAINT staff_employment_status_check
      CHECK (
        employment_status::text = ANY (
          ARRAY['active', 'inactive', 'suspended', 'resigned']::text[]
        )
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.staff_security_sessions (
  session_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id integer NOT NULL REFERENCES public.staff(staff_id) ON DELETE CASCADE,
  user_code varchar(50) NOT NULL,
  role varchar(50) NOT NULL,
  login_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address varchar(45),
  user_agent text,
  revoked_at timestamp without time zone,
  revoked_reason varchar(120)
);

CREATE INDEX IF NOT EXISTS idx_staff_security_sessions_staff_revoked
  ON public.staff_security_sessions (staff_id, revoked_at);

CREATE INDEX IF NOT EXISTS idx_staff_security_sessions_last_seen
  ON public.staff_security_sessions (last_seen_at DESC);

-- =========================
-- Phase 1: Directory + RBAC
-- =========================

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS gender varchar(20),
  ADD COLUMN IF NOT EXISTS dob date,
  ADD COLUMN IF NOT EXISTS emergency_contact_name varchar(120),
  ADD COLUMN IF NOT EXISTS emergency_contact_number varchar(30),
  ADD COLUMN IF NOT EXISTS address_line_1 varchar(255),
  ADD COLUMN IF NOT EXISTS address_line_2 varchar(255),
  ADD COLUMN IF NOT EXISTS city varchar(100),
  ADD COLUMN IF NOT EXISTS state varchar(100),
  ADD COLUMN IF NOT EXISTS postal_code varchar(20),
  ADD COLUMN IF NOT EXISTS national_id varchar(80),
  ADD COLUMN IF NOT EXISTS license_id varchar(80),
  ADD COLUMN IF NOT EXISTS department varchar(120),
  ADD COLUMN IF NOT EXISTS designation varchar(120),
  ADD COLUMN IF NOT EXISTS employment_type varchar(40),
  ADD COLUMN IF NOT EXISTS facility_code varchar(80),
  ADD COLUMN IF NOT EXISTS branch_code varchar(80),
  ADD COLUMN IF NOT EXISTS work_location varchar(150),
  ADD COLUMN IF NOT EXISTS reporting_manager_staff_id integer REFERENCES public.staff(staff_id),
  ADD COLUMN IF NOT EXISTS staff_tags text[] NOT NULL DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS idx_staff_employment_status ON public.staff (employment_status);
CREATE INDEX IF NOT EXISTS idx_staff_department ON public.staff (department);
CREATE INDEX IF NOT EXISTS idx_staff_facility_branch ON public.staff (facility_code, branch_code);

CREATE TABLE IF NOT EXISTS public.staff_roles (
  role_id serial PRIMARY KEY,
  role_code varchar(50) UNIQUE NOT NULL,
  role_name varchar(100) NOT NULL,
  is_system boolean NOT NULL DEFAULT true,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO public.staff_roles (role_code, role_name, is_system)
VALUES
  ('SUPER_ADMIN', 'Super Admin', true),
  ('ADMIN', 'Admin', true),
  ('DOCTOR', 'Doctor', true),
  ('NURSE', 'Nurse', true),
  ('LAB_TECHNICIAN', 'Lab Technician', true),
  ('PHARMACIST', 'Pharmacist', true),
  ('RECEPTIONIST', 'Receptionist', true),
  ('CASHIER', 'Cashier', true),
  ('FRONT_DESK', 'Front Desk', true),
  ('BILLING', 'Billing', true),
  ('TECHNICIAN', 'Technician', true),
  ('HOUSEKEEPING', 'Housekeeping', true)
ON CONFLICT (role_code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.staff_role_assignments (
  assignment_id bigserial PRIMARY KEY,
  staff_id integer NOT NULL REFERENCES public.staff(staff_id) ON DELETE CASCADE,
  role_id integer NOT NULL REFERENCES public.staff_roles(role_id) ON DELETE RESTRICT,
  is_primary boolean NOT NULL DEFAULT false,
  effective_from timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  effective_to timestamp without time zone,
  assigned_by integer REFERENCES public.staff(staff_id),
  assignment_note text
);

CREATE INDEX IF NOT EXISTS idx_staff_role_assignments_staff ON public.staff_role_assignments (staff_id, effective_to);
CREATE INDEX IF NOT EXISTS idx_staff_role_assignments_role ON public.staff_role_assignments (role_id, effective_to);

CREATE TABLE IF NOT EXISTS public.staff_permission_policies (
  policy_id bigserial PRIMARY KEY,
  staff_id integer REFERENCES public.staff(staff_id) ON DELETE CASCADE,
  role_id integer REFERENCES public.staff_roles(role_id) ON DELETE CASCADE,
  module varchar(80) NOT NULL,
  action varchar(20) NOT NULL,
  allowed boolean NOT NULL DEFAULT true,
  scope_type varchar(20) NOT NULL DEFAULT 'global',
  scope_value varchar(120),
  granted_by integer REFERENCES public.staff(staff_id),
  granted_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at timestamp without time zone,
  CONSTRAINT staff_permission_target_check CHECK (
    (staff_id IS NOT NULL AND role_id IS NULL)
    OR (staff_id IS NULL AND role_id IS NOT NULL)
  ),
  CONSTRAINT staff_permission_action_check CHECK (
    action::text = ANY (ARRAY['view', 'create', 'edit', 'delete', 'approve', 'export']::text[])
  ),
  CONSTRAINT staff_permission_scope_check CHECK (
    scope_type::text = ANY (ARRAY['global', 'facility', 'branch', 'department']::text[])
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_permission_policy
  ON public.staff_permission_policies (COALESCE(staff_id, 0), COALESCE(role_id, 0), module, action, scope_type, COALESCE(scope_value, ''));

CREATE TABLE IF NOT EXISTS public.staff_permission_audit (
  event_id bigserial PRIMARY KEY,
  policy_id bigint REFERENCES public.staff_permission_policies(policy_id) ON DELETE SET NULL,
  actor_staff_id integer REFERENCES public.staff(staff_id),
  event_type varchar(40) NOT NULL,
  before_json jsonb,
  after_json jsonb,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_staff_permission_audit_created_at
  ON public.staff_permission_audit (created_at DESC);

-- =========================
-- Phase 2: Attendance/Shift/Leave core
-- =========================

ALTER TABLE public.staff_attendance
  ADD COLUMN IF NOT EXISTS shift_code varchar(50),
  ADD COLUMN IF NOT EXISTS check_in_source varchar(40),
  ADD COLUMN IF NOT EXISTS check_out_source varchar(40),
  ADD COLUMN IF NOT EXISTS late_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS early_leave_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS break_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attendance_notes text;

CREATE INDEX IF NOT EXISTS idx_staff_attendance_date_staff ON public.staff_attendance (date, staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff_date ON public.staff_attendance (staff_id, date DESC);

CREATE TABLE IF NOT EXISTS public.staff_shift_templates (
  shift_template_id bigserial PRIMARY KEY,
  shift_code varchar(50) UNIQUE NOT NULL,
  shift_name varchar(120) NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_night_shift boolean NOT NULL DEFAULT false,
  is_split_shift boolean NOT NULL DEFAULT false,
  department varchar(120),
  facility_code varchar(80),
  branch_code varchar(80),
  max_staff integer,
  min_staff integer,
  created_by integer REFERENCES public.staff(staff_id),
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.staff_roster_assignments (
  roster_id bigserial PRIMARY KEY,
  staff_id integer NOT NULL REFERENCES public.staff(staff_id) ON DELETE CASCADE,
  shift_template_id bigint NOT NULL REFERENCES public.staff_shift_templates(shift_template_id) ON DELETE RESTRICT,
  roster_date date NOT NULL,
  department varchar(120),
  ward varchar(120),
  unit varchar(120),
  on_call boolean NOT NULL DEFAULT false,
  standby boolean NOT NULL DEFAULT false,
  assignment_status varchar(20) NOT NULL DEFAULT 'scheduled',
  assigned_by integer REFERENCES public.staff(staff_id),
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_roster_staff_date
  ON public.staff_roster_assignments (staff_id, roster_date);

CREATE INDEX IF NOT EXISTS idx_staff_roster_date
  ON public.staff_roster_assignments (roster_date, department);

CREATE TABLE IF NOT EXISTS public.attendance_regularization_requests (
  regularization_id bigserial PRIMARY KEY,
  staff_id integer NOT NULL REFERENCES public.staff(staff_id) ON DELETE CASCADE,
  attendance_id uuid REFERENCES public.staff_attendance(attendance_id) ON DELETE SET NULL,
  requested_check_in timestamp without time zone,
  requested_check_out timestamp without time zone,
  requested_status varchar(20),
  reason text NOT NULL,
  request_status varchar(20) NOT NULL DEFAULT 'pending',
  approved_by integer REFERENCES public.staff(staff_id),
  approved_at timestamp without time zone,
  decision_note text,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attendance_regularization_status
  ON public.attendance_regularization_requests (request_status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.staff_leave_types (
  leave_type_id serial PRIMARY KEY,
  leave_code varchar(40) UNIQUE NOT NULL,
  leave_name varchar(100) NOT NULL,
  default_annual_quota numeric(8,2),
  is_paid boolean NOT NULL DEFAULT true,
  requires_attachment boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true
);

INSERT INTO public.staff_leave_types (leave_code, leave_name, default_annual_quota, is_paid, requires_attachment, active)
VALUES
  ('CASUAL', 'Casual Leave', 12, true, false, true),
  ('SICK', 'Sick Leave', 10, true, true, true),
  ('ANNUAL', 'Annual Leave', 20, true, false, true),
  ('MATERNITY', 'Maternity Leave', 90, true, true, true),
  ('EMERGENCY', 'Emergency Leave', 6, true, false, true),
  ('UNPAID', 'Unpaid Leave', NULL, false, false, true)
ON CONFLICT (leave_code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.staff_leave_balances (
  balance_id bigserial PRIMARY KEY,
  staff_id integer NOT NULL REFERENCES public.staff(staff_id) ON DELETE CASCADE,
  leave_type_id integer NOT NULL REFERENCES public.staff_leave_types(leave_type_id) ON DELETE RESTRICT,
  period_year integer NOT NULL,
  opening_balance numeric(8,2) NOT NULL DEFAULT 0,
  accrued numeric(8,2) NOT NULL DEFAULT 0,
  consumed numeric(8,2) NOT NULL DEFAULT 0,
  adjusted numeric(8,2) NOT NULL DEFAULT 0,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_leave_balance
  ON public.staff_leave_balances (staff_id, leave_type_id, period_year);

CREATE TABLE IF NOT EXISTS public.staff_leave_requests (
  leave_request_id bigserial PRIMARY KEY,
  staff_id integer NOT NULL REFERENCES public.staff(staff_id) ON DELETE CASCADE,
  leave_type_id integer NOT NULL REFERENCES public.staff_leave_types(leave_type_id) ON DELETE RESTRICT,
  from_date date NOT NULL,
  to_date date NOT NULL,
  is_half_day boolean NOT NULL DEFAULT false,
  requested_hours numeric(6,2),
  reason text,
  attachment_url text,
  request_status varchar(20) NOT NULL DEFAULT 'pending',
  requested_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  final_approver integer REFERENCES public.staff(staff_id),
  final_decision_at timestamp without time zone,
  decision_note text
);

CREATE INDEX IF NOT EXISTS idx_staff_leave_requests_staff_status
  ON public.staff_leave_requests (staff_id, request_status, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_staff_leave_requests_range
  ON public.staff_leave_requests (from_date, to_date, request_status);

CREATE TABLE IF NOT EXISTS public.staff_leave_approvals (
  approval_id bigserial PRIMARY KEY,
  leave_request_id bigint NOT NULL REFERENCES public.staff_leave_requests(leave_request_id) ON DELETE CASCADE,
  level_no integer NOT NULL,
  approver_staff_id integer NOT NULL REFERENCES public.staff(staff_id),
  approval_status varchar(20) NOT NULL DEFAULT 'pending',
  note text,
  acted_at timestamp without time zone
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_leave_approval_level
  ON public.staff_leave_approvals (leave_request_id, level_no, approver_staff_id);

-- =========================
-- Observability and retention
-- =========================

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON public.audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_staff_created
  ON public.audit_logs (staff_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(p_days integer DEFAULT 365)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count bigint;
BEGIN
  DELETE FROM public.audit_logs
  WHERE created_at < (CURRENT_TIMESTAMP - make_interval(days => p_days));

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

