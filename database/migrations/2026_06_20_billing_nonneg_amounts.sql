-- 2026_06_20_billing_nonneg_amounts.sql
-- Stage A / Billing-Cashier: non-negative guards on money/quantity columns.
--
-- bill already has FKs to patient + visit and a payment_status CHECK;
-- cashier_payment_txn already constrains txn_type + amount<>0. The gaps:
--   * bill.total_amount had no >= 0 guard (a bill's grand total can't be negative)
--   * bill_item.quantity had no >= 0 guard
--
-- NOT constraining bill_item.amount: a negative line amount is a legitimate
-- discount/adjustment pattern; constraining it could break future billing.
-- CHECK passes for NULL, so nullable total_amount is unaffected. Verified safe:
-- 0 negative/null bill totals; bill_item currently empty.
--
-- Rollback: 2026_06_20_billing_nonneg_amounts.down.sql

BEGIN;

ALTER TABLE bill
  ADD CONSTRAINT ck_bill_total_nonneg CHECK (total_amount >= 0);

ALTER TABLE bill_item
  ADD CONSTRAINT ck_bill_item_qty_nonneg CHECK (quantity >= 0);

COMMIT;
