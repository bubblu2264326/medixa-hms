-- Rollback for 2026_06_20_patient_cnic_unique.sql
-- Removes the partial unique index on patient.cnic.

BEGIN;

DROP INDEX IF EXISTS uq_patient_cnic;

COMMIT;
