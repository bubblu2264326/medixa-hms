-- 2026_06_20_patient_cnic_unique.sql
-- Stage A / Patient-EMR: enforce uniqueness of the national identifier (CNIC)
-- so the same person cannot be registered as two patient records.
--
-- Partial unique index: multiple patients WITHOUT a CNIC (NULL or blank) are
-- still allowed (walk-ins / unidentified), but any two real CNIC values must
-- be distinct. Verified safe at apply time: 12 patients, 12 real CNICs, 0
-- duplicates, 0 null/blank.
--
-- Rollback: 2026_06_20_patient_cnic_unique.down.sql

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uq_patient_cnic
  ON patient (cnic)
  WHERE cnic IS NOT NULL AND btrim(cnic) <> '';

COMMIT;
