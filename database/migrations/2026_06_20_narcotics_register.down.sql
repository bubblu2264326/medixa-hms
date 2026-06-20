-- Rollback for 2026_06_20_narcotics_register.sql
DROP VIEW IF EXISTS v_narcotics_register;
DROP INDEX IF EXISTS idx_medicine_controlled;
ALTER TABLE medicine DROP COLUMN IF EXISTS controlled_schedule;
ALTER TABLE medicine DROP COLUMN IF EXISTS is_controlled;
