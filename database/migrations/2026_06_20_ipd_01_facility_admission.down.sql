-- Rollback for 2026_06_20_ipd_01_facility_admission.sql (drop in FK order)
DROP TABLE IF EXISTS bed_transfer;
DROP INDEX IF EXISTS uq_admission_active_bed;
DROP TABLE IF EXISTS admission;
DROP SEQUENCE IF EXISTS admission_no_seq;
DROP TABLE IF EXISTS bed;
DROP TABLE IF EXISTS room;
DROP TABLE IF EXISTS ward;
