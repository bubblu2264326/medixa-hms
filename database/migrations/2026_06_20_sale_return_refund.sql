-- M3: record the monetary refund on a pharmacy sale return.
--
-- Previously `sale_return` restored stock (via the detail trigger) but captured
-- NO money, so returns were invisible to revenue/cash reporting -> revenue and
-- cash-collected were overstated. Add an explicit refund amount + method
-- (default cash, matching cash-first PK retail), and backfill historical
-- returns from their detail lines so existing data is correct too.

ALTER TABLE sale_return
  ADD COLUMN IF NOT EXISTS refund_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_method varchar(50) NOT NULL DEFAULT 'CASH';

-- backfill existing returns from their detail lines (unit + sub-unit value)
UPDATE sale_return sr
SET refund_amount = COALESCE((
  SELECT SUM(
      COALESCE(srd.returned_quantity, 0)     * COALESCE(srd.returned_unit_price, 0)
    + COALESCE(srd.returned_sub_quantity, 0) * COALESCE(srd.returned_sub_unit_price, 0)
  )
  FROM sale_return_detail srd
  WHERE srd.return_id = sr.return_id
), 0)
WHERE refund_amount = 0;

ALTER TABLE sale_return
  ADD CONSTRAINT ck_sale_return_refund_nonneg CHECK (refund_amount >= 0);
ALTER TABLE sale_return
  ADD CONSTRAINT ck_sale_return_refund_method
  CHECK (refund_method IN ('CASH', 'CARD', 'INSURANCE', 'MOBILE', 'SPLIT'));
