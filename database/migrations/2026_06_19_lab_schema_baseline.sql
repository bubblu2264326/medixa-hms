-- Laboratory schema BASELINE (migration-divergence fix).
-- The lab tables existed only in Supabase/snapshot, never in database/migrations/,
-- so a clean rebuild from migrations lacked the entire lab schema. This captures
-- the existing schema with CREATE TABLE IF NOT EXISTS so it is a NO-OP against any
-- DB that already has these tables (incl. the live one). Dated before
-- 2026_06_21_lab_sample_collection so it applies first on a fresh rebuild.
-- (The legacy `lab_result` table — order_id/lab_result/reported_by, referenced by
-- no code — is intentionally omitted; treat as deprecated.)

CREATE TABLE IF NOT EXISTS lab_test (
  test_id     serial PRIMARY KEY,
  test_name   varchar(100) NOT NULL,
  category    varchar(50),
  price       numeric,
  description text
);

CREATE TABLE IF NOT EXISTS lab_test_parameters (
  parameter_id         serial PRIMARY KEY,
  test_id              integer NOT NULL REFERENCES lab_test(test_id),
  parameter_name       varchar(100) NOT NULL,
  parameter_code       varchar(50),
  unit                 varchar(50),
  input_type           varchar(20) DEFAULT 'number',
  reference_range_min  numeric,
  reference_range_max  numeric,
  reference_value_text text,
  display_order        integer DEFAULT 0,
  is_critical          boolean DEFAULT false,
  is_required          boolean DEFAULT true,
  created_at           timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (test_id, parameter_code)
);

CREATE TABLE IF NOT EXISTS lab_order (
  order_id           serial PRIMARY KEY,
  visit_id           integer NOT NULL REFERENCES visit(visit_id),
  test_id            integer NOT NULL REFERENCES lab_test(test_id),
  ordered_by         integer NOT NULL REFERENCES doctor(doctor_id),
  performed_by       integer REFERENCES staff(staff_id),
  status             varchar(100),
  created_at         timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  urgency            varchar(50) NOT NULL DEFAULT 'Routine',
  results_entered_at timestamp without time zone,
  results_entered_by integer REFERENCES staff(staff_id),
  finalized_at       timestamp without time zone,
  finalized_by       integer REFERENCES staff(staff_id)
);

CREATE TABLE IF NOT EXISTS lab_test_results (
  result_id        serial PRIMARY KEY,
  order_id         integer NOT NULL REFERENCES lab_order(order_id),
  parameter_id     integer NOT NULL REFERENCES lab_test_parameters(parameter_id),
  result_value     varchar(255),
  is_abnormal      boolean DEFAULT false,
  technician_notes text,
  entered_by       integer REFERENCES staff(staff_id),
  entered_at       timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  verified_by      integer REFERENCES staff(staff_id),
  verified_at      timestamp without time zone,
  UNIQUE (order_id, parameter_id)
);

CREATE TABLE IF NOT EXISTS lab_result_approvals (
  approval_id     serial PRIMARY KEY,
  order_id        integer NOT NULL UNIQUE REFERENCES lab_order(order_id),
  approved_by     integer NOT NULL REFERENCES staff(staff_id),
  approval_status varchar(20) DEFAULT 'pending',
  approval_notes  text,
  approved_at     timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  signature_data  text
);
