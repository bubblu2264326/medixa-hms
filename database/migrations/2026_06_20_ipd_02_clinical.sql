-- IPD module — migration 2 of 3: clinical core (orders, MAR, nursing, allergies).
--
-- Patient-safety backbone:
--  * doctor_order        — inpatient orders placed by a doctor (meds/lab/etc).
--  * medication_order    — the drug detail of a medication-type order; the MAR
--                          charts against THIS (so a nurse can only administer
--                          against an existing order — enforced by FK + route).
--  * medication_administration (MAR) — the legal record of each dose given,
--                          who gave it, when, and the action (given/held/...).
--  * nursing_note, intake_output — nursing documentation.
--  * patient_allergy     — patient-level allergies, surfaced at order + admin time.
-- Inpatient vitals reuse the existing patient_vitals table via a new admission_id.

-- patient-level allergies (also used by the EMR / CDS layer) ----------------
CREATE TABLE IF NOT EXISTS patient_allergy (
  allergy_id   serial PRIMARY KEY,
  patient_id   integer NOT NULL REFERENCES patient(patient_id) ON DELETE CASCADE,
  allergen     varchar(160) NOT NULL,
  reaction     text,
  severity     varchar(20) NOT NULL DEFAULT 'unknown',
  is_active    boolean NOT NULL DEFAULT true,
  noted_by     integer REFERENCES staff(staff_id),
  noted_at     timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_allergy_severity CHECK (severity IN ('mild','moderate','severe','unknown'))
);
CREATE INDEX IF NOT EXISTS idx_patient_allergy_patient ON patient_allergy(patient_id) WHERE is_active;

-- inpatient doctor orders ---------------------------------------------------
CREATE TABLE IF NOT EXISTS doctor_order (
  order_id            serial PRIMARY KEY,
  admission_id        integer NOT NULL REFERENCES admission(admission_id) ON DELETE CASCADE,
  ordered_by_doctor_id integer REFERENCES doctor(doctor_id),
  order_type          varchar(20) NOT NULL,
  details             text,
  priority            varchar(10) NOT NULL DEFAULT 'routine',
  status              varchar(15) NOT NULL DEFAULT 'active',
  start_dt            timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  stop_dt             timestamp,
  created_at          timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_order_type CHECK (order_type IN
    ('medication','lab','radiology','diet','iv','procedure','nursing')),
  CONSTRAINT ck_order_priority CHECK (priority IN ('stat','routine','prn')),
  CONSTRAINT ck_order_status CHECK (status IN ('active','held','discontinued','completed'))
);
CREATE INDEX IF NOT EXISTS idx_doctor_order_admission ON doctor_order(admission_id);
CREATE INDEX IF NOT EXISTS idx_doctor_order_status ON doctor_order(status);

-- medication detail for a medication-type order -----------------------------
CREATE TABLE IF NOT EXISTS medication_order (
  med_order_id   serial PRIMARY KEY,
  order_id       integer NOT NULL REFERENCES doctor_order(order_id) ON DELETE CASCADE,
  medicine_id    integer REFERENCES medicine(medicine_id),
  drug_name      varchar(200) NOT NULL,
  dose           varchar(80),
  route          varchar(40),
  frequency      varchar(80),
  schedule_times text,
  created_at     timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_medication_order_order ON medication_order(order_id);

-- MAR — medication administration record (legal dosing record) ---------------
CREATE TABLE IF NOT EXISTS medication_administration (
  mar_id                  serial PRIMARY KEY,
  med_order_id            integer NOT NULL REFERENCES medication_order(med_order_id) ON DELETE CASCADE,
  scheduled_dt            timestamp,
  action                  varchar(10) NOT NULL,
  administered_dt         timestamp,
  administered_by_staff_id integer REFERENCES staff(staff_id),
  dose_given              varchar(80),
  route                   varchar(40),
  reason                  text,
  notes                   text,
  created_at              timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_mar_action CHECK (action IN ('given','refused','held','skipped','missed')),
  -- a 'given' dose must record who administered it and when (non-repudiation)
  CONSTRAINT ck_mar_given_complete CHECK (
    action <> 'given' OR (administered_by_staff_id IS NOT NULL AND administered_dt IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_mar_med_order ON medication_administration(med_order_id);

-- nursing notes -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nursing_note (
  note_id        serial PRIMARY KEY,
  admission_id   integer NOT NULL REFERENCES admission(admission_id) ON DELETE CASCADE,
  shift          varchar(20),
  note_dt        timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  author_staff_id integer REFERENCES staff(staff_id),
  note           text NOT NULL,
  created_at     timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_nursing_note_admission ON nursing_note(admission_id);

-- intake / output flowsheet -------------------------------------------------
CREATE TABLE IF NOT EXISTS intake_output (
  io_id          serial PRIMARY KEY,
  admission_id   integer NOT NULL REFERENCES admission(admission_id) ON DELETE CASCADE,
  recorded_dt    timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  io_type        varchar(10) NOT NULL,
  category       varchar(40),
  volume_ml      numeric NOT NULL DEFAULT 0,
  recorded_by_staff_id integer REFERENCES staff(staff_id),
  created_at     timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_io_type CHECK (io_type IN ('intake','output')),
  CONSTRAINT ck_io_volume_nonneg CHECK (volume_ml >= 0)
);
CREATE INDEX IF NOT EXISTS idx_intake_output_admission ON intake_output(admission_id);

-- inpatient vitals reuse: link existing patient_vitals to an admission --------
ALTER TABLE patient_vitals
  ADD COLUMN IF NOT EXISTS admission_id integer REFERENCES admission(admission_id);
CREATE INDEX IF NOT EXISTS idx_patient_vitals_admission ON patient_vitals(admission_id);

-- IPD vitals may be anchored to an admission instead of an OPD visit, so relax
-- visit_id to nullable; guarantee every vital is anchored to at least one.
ALTER TABLE patient_vitals ALTER COLUMN visit_id DROP NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_vitals_anchor') THEN
    ALTER TABLE patient_vitals
      ADD CONSTRAINT ck_vitals_anchor CHECK (visit_id IS NOT NULL OR admission_id IS NOT NULL);
  END IF;
END $$;
