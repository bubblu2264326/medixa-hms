-- Rollback for 2026_06_20_appointments.sql
DROP INDEX IF EXISTS uq_appointment_active_slot;
DROP TABLE IF EXISTS appointment;
