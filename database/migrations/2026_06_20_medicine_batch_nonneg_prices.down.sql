-- Rollback for 2026_06_20_medicine_batch_nonneg_prices.sql

BEGIN;

ALTER TABLE medicine_batch
  DROP CONSTRAINT IF EXISTS ck_purchase_price_nonneg,
  DROP CONSTRAINT IF EXISTS ck_purchase_sub_unit_price_nonneg,
  DROP CONSTRAINT IF EXISTS ck_sale_price_nonneg,
  DROP CONSTRAINT IF EXISTS ck_sale_sub_unit_price_nonneg;

COMMIT;
