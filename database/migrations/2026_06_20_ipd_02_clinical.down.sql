-- Rollback for 2026_06_20_ipd_02_clinical.sql (drop in FK order)
-- (visit_id is left nullable — a benign relaxation; re-imposing NOT NULL could
--  fail if admission-only vitals were recorded.)
ALTER TABLE patient_vitals DROP CONSTRAINT IF EXISTS ck_vitals_anchor;
DROP INDEX IF EXISTS idx_patient_vitals_admission;
ALTER TABLE patient_vitals DROP COLUMN IF EXISTS admission_id;
DROP TABLE IF EXISTS intake_output;
DROP TABLE IF EXISTS nursing_note;
DROP TABLE IF EXISTS medication_administration;
DROP TABLE IF EXISTS medication_order;
DROP TABLE IF EXISTS doctor_order;
DROP TABLE IF EXISTS patient_allergy;
