-- IPD (in-patient) module — migration 1 of 3: facility structure + admission core.
--
-- Dual-loop design: OPD stays a short loop and never creates any of these rows.
-- An ADMISSION is an explicit, optional record that *references* a visit
-- (nullable for direct/planned admits). visit.status already allows
-- 'admitted'/'discharged'; the admit/discharge flow routes through
-- update_and_log_visit_status so visit_status_history stays authoritative.
--
-- This migration: ward -> room -> bed hierarchy, admission, bed_transfer.
-- Clinical (orders/MAR/nursing/allergy) and IPD billing land in migrations 2 & 3.

-- ward -> room -> bed -------------------------------------------------------
CREATE TABLE IF NOT EXISTS ward (
  ward_id       serial PRIMARY KEY,
  name          varchar(120) NOT NULL,
  ward_type     varchar(30) NOT NULL DEFAULT 'general',
  block         varchar(60),
  floor         varchar(60),
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_ward_type CHECK (ward_type IN
    ('general','semi_private','private','icu','nicu','hdu','isolation','nursery','maternity'))
);

CREATE TABLE IF NOT EXISTS room (
  room_id            serial PRIMARY KEY,
  ward_id            integer NOT NULL REFERENCES ward(ward_id) ON DELETE CASCADE,
  room_number        varchar(40) NOT NULL,
  room_class         varchar(30),
  default_daily_rate numeric NOT NULL DEFAULT 0,
  is_active          boolean NOT NULL DEFAULT true,
  created_at         timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_room_rate_nonneg CHECK (default_daily_rate >= 0),
  CONSTRAINT uq_room_ward_number UNIQUE (ward_id, room_number)
);

CREATE TABLE IF NOT EXISTS bed (
  bed_id      serial PRIMARY KEY,
  room_id     integer NOT NULL REFERENCES room(room_id) ON DELETE CASCADE,
  bed_number  varchar(40) NOT NULL,
  daily_rate  numeric NOT NULL DEFAULT 0,
  status      varchar(20) NOT NULL DEFAULT 'vacant',
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_bed_rate_nonneg CHECK (daily_rate >= 0),
  CONSTRAINT ck_bed_status CHECK (status IN ('vacant','occupied','reserved','cleaning','blocked')),
  CONSTRAINT uq_bed_room_number UNIQUE (room_id, bed_number)
);
CREATE INDEX IF NOT EXISTS idx_bed_status ON bed(status);
CREATE INDEX IF NOT EXISTS idx_room_ward ON room(ward_id);

-- admission -----------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS admission_no_seq;

CREATE TABLE IF NOT EXISTS admission (
  admission_id         serial PRIMARY KEY,
  admission_no         varchar(40) NOT NULL UNIQUE
                         DEFAULT ('IPD' || lpad(nextval('admission_no_seq')::text, 6, '0')),
  patient_id           integer NOT NULL REFERENCES patient(patient_id),
  visit_id             integer REFERENCES visit(visit_id),
  attending_doctor_id  integer REFERENCES doctor(doctor_id),
  admission_datetime   timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  admission_type       varchar(20) NOT NULL DEFAULT 'direct',
  provisional_diagnosis text,
  final_diagnosis      text,
  current_bed_id       integer REFERENCES bed(bed_id),
  status               varchar(20) NOT NULL DEFAULT 'admitted',
  discharge_datetime   timestamp,
  discharge_type       varchar(20),
  created_by           integer REFERENCES staff(staff_id),
  created_at           timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_admission_type CHECK (admission_type IN
    ('opd_referred','emergency','direct','planned')),
  CONSTRAINT ck_admission_status CHECK (status IN ('admitted','discharged')),
  CONSTRAINT ck_admission_discharge_type CHECK (discharge_type IS NULL OR discharge_type IN
    ('normal','lama','referred','transferred','death','absconded')),
  -- a discharged admission must carry a discharge timestamp + type
  CONSTRAINT ck_admission_discharge_complete CHECK (
    status <> 'discharged' OR (discharge_datetime IS NOT NULL AND discharge_type IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_admission_status ON admission(status);
CREATE INDEX IF NOT EXISTS idx_admission_patient ON admission(patient_id);
CREATE INDEX IF NOT EXISTS idx_admission_bed ON admission(current_bed_id);

-- at most one ACTIVE admission per bed (a bed can't hold two live admissions)
CREATE UNIQUE INDEX IF NOT EXISTS uq_admission_active_bed
  ON admission(current_bed_id)
  WHERE status = 'admitted' AND current_bed_id IS NOT NULL;

-- bed_transfer --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bed_transfer (
  transfer_id        serial PRIMARY KEY,
  admission_id       integer NOT NULL REFERENCES admission(admission_id) ON DELETE CASCADE,
  from_bed_id        integer REFERENCES bed(bed_id),
  to_bed_id          integer NOT NULL REFERENCES bed(bed_id),
  transfer_datetime  timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reason             text,
  by_staff_id        integer REFERENCES staff(staff_id),
  created_at         timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_bed_transfer_admission ON bed_transfer(admission_id);
