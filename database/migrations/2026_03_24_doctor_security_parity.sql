-- Doctor security parity with staff security sessions

ALTER TABLE public.doctor
  ADD COLUMN IF NOT EXISTS employment_status varchar(20) NOT NULL DEFAULT 'active',
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
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'doctor_employment_status_check'
      AND conrelid = 'public.doctor'::regclass
  ) THEN
    ALTER TABLE public.doctor
      ADD CONSTRAINT doctor_employment_status_check
      CHECK (
        employment_status::text = ANY (
          ARRAY['active', 'inactive', 'suspended', 'resigned']::text[]
        )
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.doctor_security_sessions (
  session_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id integer NOT NULL REFERENCES public.doctor(doctor_id) ON DELETE CASCADE,
  user_code varchar(50) NOT NULL,
  role varchar(50) NOT NULL DEFAULT 'Doctor',
  login_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address varchar(45),
  user_agent text,
  revoked_at timestamp without time zone,
  revoked_reason varchar(120)
);

CREATE INDEX IF NOT EXISTS idx_doctor_security_sessions_doctor_revoked
  ON public.doctor_security_sessions (doctor_id, revoked_at);

CREATE INDEX IF NOT EXISTS idx_doctor_security_sessions_last_seen
  ON public.doctor_security_sessions (last_seen_at DESC);

