-- 2026_06_20_add_completed_to_visit_status_history_check.sql
--
-- Problem: visit_status_history_status_check omitted 'completed', while the
-- visit table's visit_status_check DOES allow 'completed'. The stored procedure
-- update_and_log_visit_status() updates visit.status then inserts a
-- visit_status_history row; when transitioning to 'completed' the history insert
-- violated the CHECK and aborted the whole CALL (500), so visits could never
-- reach the terminal 'completed' state through the audited path.
--
-- Fix: align visit_status_history_status_check to the SAME status set as
-- visit_status_check (additive — adds 'completed'). Verified safe: no existing
-- visit_status_history row uses 'completed'.
--
-- Scope: local DB. (Supabase project is paused; apply there separately when resumed.)

BEGIN;

ALTER TABLE visit_status_history
  DROP CONSTRAINT IF EXISTS visit_status_history_status_check;

ALTER TABLE visit_status_history
  ADD CONSTRAINT visit_status_history_status_check
  CHECK (status::text = ANY (ARRAY[
    'waiting',
    'seen_by_doctor',
    'dispensing',
    'medicines_dispensed',
    'lab_tests_done',
    'payment_done',
    'completed',
    'admitted',
    'discharged'
  ]::text[]));

COMMIT;
