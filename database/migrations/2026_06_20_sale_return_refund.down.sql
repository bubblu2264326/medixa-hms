-- Rollback for 2026_06_20_sale_return_refund.sql
ALTER TABLE sale_return DROP CONSTRAINT IF EXISTS ck_sale_return_refund_method;
ALTER TABLE sale_return DROP CONSTRAINT IF EXISTS ck_sale_return_refund_nonneg;
ALTER TABLE sale_return DROP COLUMN IF EXISTS refund_method;
ALTER TABLE sale_return DROP COLUMN IF EXISTS refund_amount;
