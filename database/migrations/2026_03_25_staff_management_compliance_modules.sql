-- Staff Management Compliance Modules (Credentialing + Documents + Lifecycle + Analytics foundations)

-- =========================
-- Credentialing
-- =========================

CREATE TABLE IF NOT EXISTS public.employee_credential_types (
  credential_type_id serial PRIMARY KEY,
  credential_code varchar(60) NOT NULL UNIQUE,
  credential_name varchar(140) NOT NULL,
  credential_category varchar(80),
  issuing_authority_default varchar(160),
  validity_months integer,
  renewal_window_days integer NOT NULL DEFAULT 60,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.employee_credentials (
  credential_id bigserial PRIMARY KEY,
  account_type varchar(20) NOT NULL DEFAULT 'staff',
  person_id integer NOT NULL,
  staff_id integer REFERENCES public.staff(staff_id) ON DELETE CASCADE,
  doctor_id integer REFERENCES public.doctor(doctor_id) ON DELETE CASCADE,
  credential_type_id integer NOT NULL REFERENCES public.employee_credential_types(credential_type_id) ON DELETE RESTRICT,
  credential_number varchar(120) NOT NULL,
  credential_title varchar(160),
  issued_on date,
  expires_on date,
  issuing_authority varchar(160),
  issuing_country varchar(80),
  verification_status varchar(30) NOT NULL DEFAULT 'draft',
  renewal_status varchar(30) NOT NULL DEFAULT 'not_due',
  reminder_status varchar(30) NOT NULL DEFAULT 'none',
  submitted_at timestamp without time zone,
  reviewed_by integer REFERENCES public.staff(staff_id),
  reviewed_at timestamp without time zone,
  review_note text,
  verified_at timestamp without time zone,
  revoked_by integer REFERENCES public.staff(staff_id),
  revoked_at timestamp without time zone,
  revoke_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT employee_credentials_account_type_check CHECK (
    account_type::text = ANY (ARRAY['staff', 'doctor']::text[])
  ),
  CONSTRAINT employee_credentials_status_check CHECK (
    verification_status::text = ANY (
      ARRAY['draft', 'submitted', 'under_review', 'verified', 'rejected', 'revoked', 'expired']::text[]
    )
  ),
  CONSTRAINT employee_credentials_renewal_status_check CHECK (
    renewal_status::text = ANY (
      ARRAY['not_due', 'due', 'in_progress', 'renewed', 'overdue', 'blocked']::text[]
    )
  ),
  CONSTRAINT employee_credentials_employee_ref_check CHECK (
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_employee_credentials_unique_number
  ON public.employee_credentials (credential_type_id, credential_number, account_type, person_id);

CREATE INDEX IF NOT EXISTS idx_employee_credentials_expiry
  ON public.employee_credentials (expires_on, verification_status);

CREATE INDEX IF NOT EXISTS idx_employee_credentials_employee
  ON public.employee_credentials (account_type, person_id, verification_status);

CREATE TABLE IF NOT EXISTS public.employee_credential_events (
  credential_event_id bigserial PRIMARY KEY,
  credential_id bigint NOT NULL REFERENCES public.employee_credentials(credential_id) ON DELETE CASCADE,
  actor_staff_id integer REFERENCES public.staff(staff_id),
  event_type varchar(40) NOT NULL,
  from_status varchar(30),
  to_status varchar(30),
  event_note text,
  payload jsonb,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_employee_credential_events_credential
  ON public.employee_credential_events (credential_id, created_at DESC);

-- =========================
-- Documents
-- =========================

CREATE TABLE IF NOT EXISTS public.employee_document_types (
  document_type_id serial PRIMARY KEY,
  document_code varchar(60) NOT NULL UNIQUE,
  document_name varchar(140) NOT NULL,
  document_category varchar(80),
  required_default boolean NOT NULL DEFAULT false,
  requires_expiry boolean NOT NULL DEFAULT false,
  retention_days integer,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.employee_documents (
  document_id bigserial PRIMARY KEY,
  account_type varchar(20) NOT NULL DEFAULT 'staff',
  person_id integer NOT NULL,
  staff_id integer REFERENCES public.staff(staff_id) ON DELETE CASCADE,
  doctor_id integer REFERENCES public.doctor(doctor_id) ON DELETE CASCADE,
  document_type_id integer NOT NULL REFERENCES public.employee_document_types(document_type_id) ON DELETE RESTRICT,
  document_title varchar(180) NOT NULL,
  document_description text,
  review_status varchar(30) NOT NULL DEFAULT 'draft',
  visibility varchar(20) NOT NULL DEFAULT 'internal',
  current_version_no integer NOT NULL DEFAULT 0,
  effective_from date,
  effective_to date,
  expires_on date,
  required_by date,
  submitted_by integer REFERENCES public.staff(staff_id),
  submitted_at timestamp without time zone,
  reviewed_by integer REFERENCES public.staff(staff_id),
  reviewed_at timestamp without time zone,
  review_note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT employee_documents_account_type_check CHECK (
    account_type::text = ANY (ARRAY['staff', 'doctor']::text[])
  ),
  CONSTRAINT employee_documents_review_status_check CHECK (
    review_status::text = ANY (
      ARRAY['draft', 'submitted', 'under_review', 'approved', 'rejected', 'expired', 'archived']::text[]
    )
  ),
  CONSTRAINT employee_documents_visibility_check CHECK (
    visibility::text = ANY (ARRAY['internal', 'restricted', 'confidential']::text[])
  ),
  CONSTRAINT employee_documents_employee_ref_check CHECK (
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

CREATE INDEX IF NOT EXISTS idx_employee_documents_status
  ON public.employee_documents (review_status, expires_on);

CREATE INDEX IF NOT EXISTS idx_employee_documents_employee
  ON public.employee_documents (account_type, person_id, document_type_id);

CREATE TABLE IF NOT EXISTS public.employee_document_versions (
  version_id bigserial PRIMARY KEY,
  document_id bigint NOT NULL REFERENCES public.employee_documents(document_id) ON DELETE CASCADE,
  version_no integer NOT NULL,
  storage_path text,
  file_url text,
  file_name varchar(255),
  mime_type varchar(120),
  file_size_bytes bigint,
  checksum_sha256 varchar(128),
  uploaded_by integer REFERENCES public.staff(staff_id),
  uploaded_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT employee_document_versions_version_no_check CHECK (version_no > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_employee_document_versions_doc_version
  ON public.employee_document_versions (document_id, version_no);

CREATE INDEX IF NOT EXISTS idx_employee_document_versions_document
  ON public.employee_document_versions (document_id, uploaded_at DESC);

CREATE TABLE IF NOT EXISTS public.employee_document_reviews (
  document_review_id bigserial PRIMARY KEY,
  document_id bigint NOT NULL REFERENCES public.employee_documents(document_id) ON DELETE CASCADE,
  version_id bigint REFERENCES public.employee_document_versions(version_id) ON DELETE SET NULL,
  reviewer_staff_id integer REFERENCES public.staff(staff_id),
  review_action varchar(30) NOT NULL,
  review_note text,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT employee_document_reviews_action_check CHECK (
    review_action::text = ANY (
      ARRAY['submitted', 'under_review', 'approved', 'rejected', 'requested_changes', 'archived']::text[]
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_employee_document_reviews_document
  ON public.employee_document_reviews (document_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.employee_document_requirements (
  requirement_id bigserial PRIMARY KEY,
  document_type_id integer NOT NULL REFERENCES public.employee_document_types(document_type_id) ON DELETE CASCADE,
  target_type varchar(30) NOT NULL,
  target_value varchar(120),
  mandatory boolean NOT NULL DEFAULT true,
  due_days_from_joining integer,
  recurrence_days integer,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT employee_document_requirements_target_type_check CHECK (
    target_type::text = ANY (ARRAY['global', 'role', 'department', 'facility', 'account_type']::text[])
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_employee_document_requirement_scope
  ON public.employee_document_requirements (document_type_id, target_type, COALESCE(target_value, ''));

-- =========================
-- Lifecycle
-- =========================

CREATE TABLE IF NOT EXISTS public.employee_lifecycle_templates (
  lifecycle_template_id bigserial PRIMARY KEY,
  template_code varchar(60) NOT NULL UNIQUE,
  template_name varchar(140) NOT NULL,
  lifecycle_type varchar(30) NOT NULL,
  applies_to varchar(20) NOT NULL DEFAULT 'both',
  role_code varchar(80),
  department varchar(120),
  facility_code varchar(80),
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by integer REFERENCES public.staff(staff_id),
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT employee_lifecycle_templates_type_check CHECK (
    lifecycle_type::text = ANY (ARRAY['onboarding', 'offboarding', 'probation', 'transfer']::text[])
  ),
  CONSTRAINT employee_lifecycle_templates_applies_to_check CHECK (
    applies_to::text = ANY (ARRAY['staff', 'doctor', 'both']::text[])
  )
);

CREATE TABLE IF NOT EXISTS public.employee_lifecycle_template_tasks (
  lifecycle_template_task_id bigserial PRIMARY KEY,
  lifecycle_template_id bigint NOT NULL REFERENCES public.employee_lifecycle_templates(lifecycle_template_id) ON DELETE CASCADE,
  task_code varchar(80) NOT NULL,
  task_name varchar(180) NOT NULL,
  task_group varchar(80),
  sequence_no integer NOT NULL DEFAULT 1,
  default_owner_role varchar(80),
  mandatory boolean NOT NULL DEFAULT true,
  due_offset_days integer,
  requires_document_type_id integer REFERENCES public.employee_document_types(document_type_id) ON DELETE SET NULL,
  blocks_transition boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_employee_lifecycle_template_task_code
  ON public.employee_lifecycle_template_tasks (lifecycle_template_id, task_code);

CREATE TABLE IF NOT EXISTS public.employee_lifecycle_runs (
  lifecycle_run_id bigserial PRIMARY KEY,
  account_type varchar(20) NOT NULL DEFAULT 'staff',
  person_id integer NOT NULL,
  staff_id integer REFERENCES public.staff(staff_id) ON DELETE CASCADE,
  doctor_id integer REFERENCES public.doctor(doctor_id) ON DELETE CASCADE,
  lifecycle_template_id bigint REFERENCES public.employee_lifecycle_templates(lifecycle_template_id) ON DELETE SET NULL,
  lifecycle_type varchar(30) NOT NULL,
  run_status varchar(30) NOT NULL DEFAULT 'draft',
  started_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at timestamp without time zone,
  initiated_by integer REFERENCES public.staff(staff_id),
  summary_note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT employee_lifecycle_runs_account_type_check CHECK (
    account_type::text = ANY (ARRAY['staff', 'doctor']::text[])
  ),
  CONSTRAINT employee_lifecycle_runs_type_check CHECK (
    lifecycle_type::text = ANY (ARRAY['onboarding', 'offboarding', 'probation', 'transfer']::text[])
  ),
  CONSTRAINT employee_lifecycle_runs_status_check CHECK (
    run_status::text = ANY (ARRAY['draft', 'in_progress', 'blocked', 'completed', 'cancelled']::text[])
  ),
  CONSTRAINT employee_lifecycle_runs_employee_ref_check CHECK (
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

CREATE INDEX IF NOT EXISTS idx_employee_lifecycle_runs_status
  ON public.employee_lifecycle_runs (run_status, lifecycle_type, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_employee_lifecycle_runs_employee
  ON public.employee_lifecycle_runs (account_type, person_id, run_status);

CREATE TABLE IF NOT EXISTS public.employee_lifecycle_tasks (
  lifecycle_task_id bigserial PRIMARY KEY,
  lifecycle_run_id bigint NOT NULL REFERENCES public.employee_lifecycle_runs(lifecycle_run_id) ON DELETE CASCADE,
  lifecycle_template_task_id bigint REFERENCES public.employee_lifecycle_template_tasks(lifecycle_template_task_id) ON DELETE SET NULL,
  task_code varchar(80) NOT NULL,
  task_name varchar(180) NOT NULL,
  task_group varchar(80),
  owner_staff_id integer REFERENCES public.staff(staff_id),
  task_status varchar(30) NOT NULL DEFAULT 'pending',
  due_at timestamp without time zone,
  completed_at timestamp without time zone,
  completed_by integer REFERENCES public.staff(staff_id),
  completion_note text,
  evidence_document_id bigint REFERENCES public.employee_documents(document_id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT employee_lifecycle_tasks_status_check CHECK (
    task_status::text = ANY (
      ARRAY['pending', 'in_progress', 'completed', 'skipped', 'blocked', 'cancelled', 'overdue']::text[]
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_employee_lifecycle_tasks_run_task_code
  ON public.employee_lifecycle_tasks (lifecycle_run_id, task_code);

CREATE INDEX IF NOT EXISTS idx_employee_lifecycle_tasks_status_due
  ON public.employee_lifecycle_tasks (task_status, due_at);

CREATE TABLE IF NOT EXISTS public.employee_lifecycle_events (
  lifecycle_event_id bigserial PRIMARY KEY,
  lifecycle_run_id bigint REFERENCES public.employee_lifecycle_runs(lifecycle_run_id) ON DELETE CASCADE,
  lifecycle_task_id bigint REFERENCES public.employee_lifecycle_tasks(lifecycle_task_id) ON DELETE CASCADE,
  actor_staff_id integer REFERENCES public.staff(staff_id),
  event_type varchar(40) NOT NULL,
  from_status varchar(30),
  to_status varchar(30),
  event_note text,
  payload jsonb,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_employee_lifecycle_events_run
  ON public.employee_lifecycle_events (lifecycle_run_id, created_at DESC);

-- =========================
-- Seed defaults
-- =========================

INSERT INTO public.employee_credential_types (credential_code, credential_name, credential_category, issuing_authority_default, validity_months, renewal_window_days, active)
VALUES
  ('MED_LICENSE', 'Medical License', 'license', 'Medical Council', 12, 90, true),
  ('BLS', 'Basic Life Support', 'certification', 'Accredited Provider', 24, 60, true),
  ('ACLS', 'Advanced Cardiac Life Support', 'certification', 'Accredited Provider', 24, 60, true),
  ('DEA', 'Controlled Substance Registration', 'license', 'Regulatory Authority', 36, 120, true)
ON CONFLICT (credential_code) DO NOTHING;

INSERT INTO public.employee_document_types (document_code, document_name, document_category, required_default, requires_expiry, retention_days, active)
VALUES
  ('ID_PROOF', 'Government ID Proof', 'identity', true, false, 3650, true),
  ('CONTRACT', 'Employment Contract', 'employment', true, false, 3650, true),
  ('LICENSE_COPY', 'Professional License Copy', 'compliance', true, true, 3650, true),
  ('BACKGROUND_CHECK', 'Background Verification', 'compliance', false, true, 1825, true)
ON CONFLICT (document_code) DO NOTHING;

INSERT INTO public.employee_lifecycle_templates (template_code, template_name, lifecycle_type, applies_to, is_active, metadata)
VALUES
  ('ONBOARD_STD', 'Standard Onboarding', 'onboarding', 'both', true, '{"version":"v1"}'::jsonb),
  ('OFFBOARD_STD', 'Standard Offboarding', 'offboarding', 'both', true, '{"version":"v1"}'::jsonb)
ON CONFLICT (template_code) DO NOTHING;

INSERT INTO public.employee_lifecycle_template_tasks (
  lifecycle_template_id,
  task_code,
  task_name,
  task_group,
  sequence_no,
  default_owner_role,
  mandatory,
  due_offset_days,
  blocks_transition,
  metadata
)
SELECT t.lifecycle_template_id, x.task_code, x.task_name, x.task_group, x.sequence_no, x.default_owner_role, x.mandatory, x.due_offset_days, x.blocks_transition, x.metadata
FROM public.employee_lifecycle_templates t
JOIN (
  VALUES
    ('ONBOARD_STD', 'CREATE_ACCOUNT', 'Create User Account', 'it', 1, 'Admin', true, 0, true, '{"module":"access"}'::jsonb),
    ('ONBOARD_STD', 'COLLECT_DOCS', 'Collect Mandatory Documents', 'hr', 2, 'Admin', true, 7, true, '{"module":"documents"}'::jsonb),
    ('ONBOARD_STD', 'VERIFY_CREDENTIALS', 'Verify Credentials', 'compliance', 3, 'Admin', true, 14, true, '{"module":"credentialing"}'::jsonb),
    ('OFFBOARD_STD', 'REVOKE_ACCESS', 'Revoke System Access', 'it', 1, 'Admin', true, 0, true, '{"module":"security"}'::jsonb),
    ('OFFBOARD_STD', 'ASSET_HANDOVER', 'Complete Asset Handover', 'operations', 2, 'Admin', true, 2, true, '{"module":"lifecycle"}'::jsonb),
    ('OFFBOARD_STD', 'ARCHIVE_RECORDS', 'Archive Employee Records', 'hr', 3, 'Admin', true, 5, true, '{"module":"documents"}'::jsonb)
) AS x(template_code, task_code, task_name, task_group, sequence_no, default_owner_role, mandatory, due_offset_days, blocks_transition, metadata)
  ON x.template_code = t.template_code
WHERE NOT EXISTS (
  SELECT 1
  FROM public.employee_lifecycle_template_tasks existing
  WHERE existing.lifecycle_template_id = t.lifecycle_template_id
    AND existing.task_code = x.task_code
);
