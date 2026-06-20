-- Rollback for 2026_06_20_billing_nonneg_amounts.sql

BEGIN;

ALTER TABLE bill DROP CONSTRAINT IF EXISTS ck_bill_total_nonneg;
ALTER TABLE bill_item DROP CONSTRAINT IF EXISTS ck_bill_item_qty_nonneg;

COMMIT;
