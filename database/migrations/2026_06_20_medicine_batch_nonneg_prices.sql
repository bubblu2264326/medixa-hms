-- 2026_06_20_medicine_batch_nonneg_prices.sql
-- Stage A / Pharmacy-Inventory: enforce non-negative prices on medicine_batch.
--
-- Stock non-negativity is already enforced (ck_stock_qty_non_negative,
-- ck_sub_stock_qty_non_negative), but the four price columns had no guard.
-- CHECK passes for NULL, so nullable sub-unit prices are unaffected — only
-- negative non-null prices are rejected. Verified safe at apply time: 24
-- batches, 0 negative prices.
--
-- Rollback: 2026_06_20_medicine_batch_nonneg_prices.down.sql

BEGIN;

ALTER TABLE medicine_batch
  ADD CONSTRAINT ck_purchase_price_nonneg CHECK (purchase_price >= 0),
  ADD CONSTRAINT ck_purchase_sub_unit_price_nonneg CHECK (purchase_sub_unit_price >= 0),
  ADD CONSTRAINT ck_sale_price_nonneg CHECK (sale_price >= 0),
  ADD CONSTRAINT ck_sale_sub_unit_price_nonneg CHECK (sale_sub_unit_price >= 0);

COMMIT;
