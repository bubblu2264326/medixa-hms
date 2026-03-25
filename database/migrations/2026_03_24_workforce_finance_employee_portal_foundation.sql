-- Workforce Finance + Employee Portal Foundation
-- Supabase source-of-truth aligned migration

-- =========================
-- Compensation profiles
-- =========================
CREATE TABLE IF NOT EXISTS public.employee_compensation_profile (
  compensation_id bigserial PRIMARY KEY,
  account_type varchar(20) NOT NULL,
  person_id integer NOT NULL,
  staff_id integer REFERENCES public.staff(staff_id) ON DELETE CASCADE,
  doctor_id integer REFERENCES public.doctor(doctor_id) ON DELETE CASCADE,
  salary_model varchar(30) NOT NULL DEFAULT 'fixed_monthly',
  payroll_cycle varchar(20) NOT NULL DEFAULT 'monthly',
  base_monthly_salary numeric(12,2) NOT NULL DEFAULT 0,
  per_patient_fee numeric(12,2) NOT NULL DEFAULT 0,
  active_from date NOT NULL DEFAULT CURRENT_DATE,
  active_to date,
  notes text,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT employee_compensation_account_type_check
    CHECK (account_type IN ('staff', 'doctor')),
  CONSTRAINT employee_compensation_salary_model_check
    CHECK (salary_model IN ('fixed_monthly', 'per_patient_seen')),
  CONSTRAINT employee_compensation_payroll_cycle_check
    CHECK (payroll_cycle IN ('monthly')),
  CONSTRAINT employee_compensation_ref_check
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
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_employee_compensation_profile_person
  ON public.employee_compensation_profile (account_type, person_id, active_from);

CREATE INDEX IF NOT EXISTS idx_employee_compensation_profile_active
  ON public.employee_compensation_profile (account_type, person_id, active_to);

-- =========================
-- Allowances
-- =========================
CREATE TABLE IF NOT EXISTS public.employee_allowance (
  allowance_id bigserial PRIMARY KEY,
  account_type varchar(20) NOT NULL,
  person_id integer NOT NULL,
  staff_id integer REFERENCES public.staff(staff_id) ON DELETE CASCADE,
  doctor_id integer REFERENCES public.doctor(doctor_id) ON DELETE CASCADE,
  allowance_code varchar(40) NOT NULL,
  allowance_name varchar(120) NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  allowance_mode varchar(20) NOT NULL DEFAULT 'recurring',
  taxable boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  notes text,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT employee_allowance_account_type_check
    CHECK (account_type IN ('staff', 'doctor')),
  CONSTRAINT employee_allowance_mode_check
    CHECK (allowance_mode IN ('recurring', 'one_time')),
  CONSTRAINT employee_allowance_ref_check
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
    )
);

CREATE INDEX IF NOT EXISTS idx_employee_allowance_person_active
  ON public.employee_allowance (account_type, person_id, is_active, effective_from, effective_to);

-- =========================
-- Payroll runs
-- =========================
CREATE TABLE IF NOT EXISTS public.payroll_run (
  payroll_run_id bigserial PRIMARY KEY,
  period_month date NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'draft',
  generated_by integer REFERENCES public.staff(staff_id),
  finalized_by integer REFERENCES public.staff(staff_id),
  generated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finalized_at timestamp without time zone,
  notes text,
  CONSTRAINT payroll_run_status_check
    CHECK (status IN ('draft', 'finalized', 'void')),
  CONSTRAINT payroll_run_month_first_day_check
    CHECK (date_trunc('month', period_month)::date = period_month)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payroll_run_period_month
  ON public.payroll_run (period_month);

CREATE TABLE IF NOT EXISTS public.payroll_line_item (
  payroll_line_id bigserial PRIMARY KEY,
  payroll_run_id bigint NOT NULL REFERENCES public.payroll_run(payroll_run_id) ON DELETE CASCADE,
  account_type varchar(20) NOT NULL,
  person_id integer NOT NULL,
  staff_id integer REFERENCES public.staff(staff_id) ON DELETE CASCADE,
  doctor_id integer REFERENCES public.doctor(doctor_id) ON DELETE CASCADE,
  salary_model varchar(30) NOT NULL,
  base_amount numeric(12,2) NOT NULL DEFAULT 0,
  patient_count integer NOT NULL DEFAULT 0,
  per_patient_fee numeric(12,2) NOT NULL DEFAULT 0,
  allowance_total numeric(12,2) NOT NULL DEFAULT 0,
  deduction_total numeric(12,2) NOT NULL DEFAULT 0,
  adjustment_total numeric(12,2) NOT NULL DEFAULT 0,
  gross_amount numeric(12,2) NOT NULL DEFAULT 0,
  net_amount numeric(12,2) NOT NULL DEFAULT 0,
  calc_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT payroll_line_account_type_check
    CHECK (account_type IN ('staff', 'doctor')),
  CONSTRAINT payroll_line_salary_model_check
    CHECK (salary_model IN ('fixed_monthly', 'per_patient_seen')),
  CONSTRAINT payroll_line_ref_check
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
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payroll_line_item_per_run
  ON public.payroll_line_item (payroll_run_id, account_type, person_id);

CREATE INDEX IF NOT EXISTS idx_payroll_line_item_person
  ON public.payroll_line_item (account_type, person_id, created_at DESC);

-- =========================
-- Finance expenses and assets
-- =========================
CREATE TABLE IF NOT EXISTS public.finance_expense_entry (
  expense_id bigserial PRIMARY KEY,
  expense_date date NOT NULL,
  category varchar(60) NOT NULL,
  subcategory varchar(60),
  amount numeric(12,2) NOT NULL,
  vendor_name varchar(120),
  reference_no varchar(120),
  payment_mode varchar(40),
  notes text,
  created_by integer REFERENCES public.staff(staff_id),
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_finance_expense_entry_date
  ON public.finance_expense_entry (expense_date DESC, category);

CREATE TABLE IF NOT EXISTS public.finance_asset_purchase (
  asset_purchase_id bigserial PRIMARY KEY,
  purchase_date date NOT NULL,
  asset_name varchar(180) NOT NULL,
  asset_category varchar(80) NOT NULL,
  amount numeric(12,2) NOT NULL,
  vendor_name varchar(120),
  reference_no varchar(120),
  useful_life_months integer,
  notes text,
  created_by integer REFERENCES public.staff(staff_id),
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_finance_asset_purchase_date
  ON public.finance_asset_purchase (purchase_date DESC, asset_category);

-- =========================
-- Leave policy defaults/overrides
-- =========================
CREATE TABLE IF NOT EXISTS public.leave_role_quota (
  role_quota_id bigserial PRIMARY KEY,
  role_name varchar(80) NOT NULL,
  leave_type_id integer NOT NULL REFERENCES public.staff_leave_types(leave_type_id) ON DELETE RESTRICT,
  annual_quota numeric(8,2) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (role_name, leave_type_id)
);

CREATE TABLE IF NOT EXISTS public.leave_employee_quota_override (
  override_id bigserial PRIMARY KEY,
  account_type varchar(20) NOT NULL,
  person_id integer NOT NULL,
  staff_id integer REFERENCES public.staff(staff_id) ON DELETE CASCADE,
  doctor_id integer REFERENCES public.doctor(doctor_id) ON DELETE CASCADE,
  leave_type_id integer NOT NULL REFERENCES public.staff_leave_types(leave_type_id) ON DELETE RESTRICT,
  annual_quota numeric(8,2) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT leave_employee_override_account_type_check
    CHECK (account_type IN ('staff', 'doctor')),
  CONSTRAINT leave_employee_override_ref_check
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
    ),
  UNIQUE (account_type, person_id, leave_type_id)
);

-- =========================
-- Backward-compatible leave balance extension
-- =========================
ALTER TABLE public.staff_leave_balances
  ADD COLUMN IF NOT EXISTS account_type varchar(20),
  ADD COLUMN IF NOT EXISTS person_id integer,
  ADD COLUMN IF NOT EXISTS doctor_id integer REFERENCES public.doctor(doctor_id) ON DELETE CASCADE;

UPDATE public.staff_leave_balances
SET account_type = COALESCE(account_type, 'staff'),
    person_id = COALESCE(person_id, staff_id)
WHERE account_type IS NULL OR person_id IS NULL;

ALTER TABLE public.staff_leave_balances
  ALTER COLUMN account_type SET DEFAULT 'staff';

ALTER TABLE public.staff_leave_balances
  ALTER COLUMN account_type SET NOT NULL;

ALTER TABLE public.staff_leave_balances
  ALTER COLUMN person_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'staff_leave_balances_account_type_check'
      AND conrelid = 'public.staff_leave_balances'::regclass
  ) THEN
    ALTER TABLE public.staff_leave_balances
      ADD CONSTRAINT staff_leave_balances_account_type_check
      CHECK (account_type IN ('staff', 'doctor'));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'uq_staff_leave_balance'
  ) THEN
    DROP INDEX public.uq_staff_leave_balance;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_leave_balance_account_person
  ON public.staff_leave_balances (account_type, person_id, leave_type_id, period_year);

-- Seed role quotas from existing leave defaults for common workforce roles.
INSERT INTO public.leave_role_quota (role_name, leave_type_id, annual_quota)
SELECT role_name, lt.leave_type_id, COALESCE(lt.default_annual_quota, 0)
FROM (VALUES
  ('Receptionist'),
  ('Lab_Technician'),
  ('Admin'),
  ('Super Admin'),
  ('Cashier'),
  ('Pharmacist'),
  ('Nurse'),
  ('Doctor'),
  ('Front_Desk'),
  ('Billing'),
  ('Technician'),
  ('Housekeeping')
) AS roles(role_name)
CROSS JOIN public.staff_leave_types lt
ON CONFLICT (role_name, leave_type_id) DO NOTHING;
