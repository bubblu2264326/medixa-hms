-- Migration: Stock Reconciliation + Negative Stock Guard
-- Purpose:
--   1. Reconcile corrupted medicine_batch stock from the double-decrement bug
--      in fn_tg_purchase_return_detail_to_txn (that trigger used to update
--      medicine_batch directly AND also insert into medicine_transaction, which
--      fired fn_tg_stockquantity_generic → second update).
--   2. Add a negative-stock guard to fn_tg_stockquantity_generic so that no
--      batch or medicine can ever go below zero.
--
-- Dependencies: The trigger fix in 5_FEB_10_14_AM_batch_id_trigger_update.sql
--   must already be applied (purchase_return trigger no longer does a direct
--   UPDATE on medicine_batch).

BEGIN;

-- ============================================================================
-- 1. STOCK RECONCILIATION
-- ============================================================================
/*
  Strategy:
    The transaction log (medicine_transaction) is our immutable source of truth.
    We recompute batch-level and medicine-level stock from scratch and apply.

  For each batch, the correct stock =
    SUM of (purchase + sale_return)  -  SUM of (sale + purchase_return)
  expressed in total sub-units, then split back into units / sub-units.
*/

-- 1a. Rebuild batch stock from transaction log
WITH txn_totals AS (
  SELECT
    mt.batch_id,
    m.sub_units_per_unit,
    SUM(
      CASE
        WHEN mt.txn_type IN ('purchase','sale_return') THEN
          (mt.quantity * COALESCE(NULLIF(m.sub_units_per_unit, 0), 1))
          + COALESCE(mt.sub_quantity, 0)
        WHEN mt.txn_type IN ('sale','purchase_return') THEN
          -((mt.quantity * COALESCE(NULLIF(m.sub_units_per_unit, 0), 1))
            + COALESCE(mt.sub_quantity, 0))
        ELSE 0
      END
    ) AS total_sub_units
  FROM medicine_transaction mt
  JOIN medicine m ON m.medicine_id = mt.medicine_id
  WHERE mt.batch_id IS NOT NULL
  GROUP BY mt.batch_id, m.sub_units_per_unit
)
UPDATE medicine_batch mb
SET
  stock_quantity    = GREATEST(0, t.total_sub_units) / COALESCE(NULLIF(t.sub_units_per_unit, 0), 1),
  stock_sub_quantity = GREATEST(0, t.total_sub_units) % COALESCE(NULLIF(t.sub_units_per_unit, 0), 1)
FROM txn_totals t
WHERE mb.batch_id = t.batch_id;

-- 1b. Rebuild medicine-level stock from corrected batch data
WITH batch_agg AS (
  SELECT
    mb.medicine_id,
    COALESCE(NULLIF(m.sub_units_per_unit, 0), 1) AS sub_units_per_unit,
    SUM(
      (COALESCE(mb.stock_quantity, 0) * COALESCE(NULLIF(m.sub_units_per_unit, 0), 1))
      + COALESCE(mb.stock_sub_quantity, 0)
    ) AS total_sub_units
  FROM medicine_batch mb
  JOIN medicine m ON m.medicine_id = mb.medicine_id
  GROUP BY mb.medicine_id, m.sub_units_per_unit
)
UPDATE medicine med
SET
  stock_quantity     = a.total_sub_units / a.sub_units_per_unit,
  stock_sub_quantity = a.total_sub_units % a.sub_units_per_unit
FROM batch_agg a
WHERE med.medicine_id = a.medicine_id;


-- ============================================================================
-- 2. NEGATIVE STOCK GUARD IN fn_tg_stockquantity_generic
-- ============================================================================
/*
  Adds a check after the stock update to RAISE an EXCEPTION if the resulting
  stock on either medicine or medicine_batch falls below zero. This prevents
  overselling at the database level – the last line of defence.
*/

CREATE OR REPLACE FUNCTION public.fn_tg_stockquantity_generic() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_sign INTEGER;
    v_sub_units_per_unit INTEGER;
    v_total_sub_units_change INTEGER;
    v_medicine_id INTEGER;
    v_batch_id INTEGER;
    v_new_med_qty INTEGER;
    v_new_med_sub_qty INTEGER;
    v_new_batch_qty INTEGER;
    v_new_batch_sub_qty INTEGER;
BEGIN
    v_medicine_id := COALESCE(NEW.medicine_id, OLD.medicine_id);
    v_batch_id := COALESCE(NEW.batch_id, OLD.batch_id);

    SELECT sub_units_per_unit INTO v_sub_units_per_unit
    FROM medicine WHERE medicine_id = v_medicine_id;

    IF v_sub_units_per_unit IS NULL OR v_sub_units_per_unit = 0 THEN
        v_sub_units_per_unit := 1;
    END IF;

    -- Determine sign
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        IF NEW.txn_type IN ('purchase', 'sale_return') THEN v_sign := 1;
        ELSIF NEW.txn_type IN ('sale', 'purchase_return') THEN v_sign := -1;
        ELSIF NEW.txn_type = 'adjustment' THEN v_sign := 1;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.txn_type IN ('purchase', 'sale_return') THEN v_sign := 1;
        ELSE v_sign := -1;
        END IF;
    END IF;

    IF TG_OP = 'INSERT' THEN
        v_total_sub_units_change := (NEW.quantity * v_sub_units_per_unit) + COALESCE(NEW.sub_quantity, 0);

        -- Update medicine-level stock
        UPDATE medicine
        SET stock_quantity = (
              (stock_quantity * v_sub_units_per_unit) + stock_sub_quantity
              + (v_sign * v_total_sub_units_change)
            ) / v_sub_units_per_unit,
            stock_sub_quantity = (
              (stock_quantity * v_sub_units_per_unit) + stock_sub_quantity
              + (v_sign * v_total_sub_units_change)
            ) % v_sub_units_per_unit
        WHERE medicine_id = v_medicine_id
        RETURNING stock_quantity, stock_sub_quantity
        INTO v_new_med_qty, v_new_med_sub_qty;

        -- Update batch-level stock
        IF NEW.batch_id IS NOT NULL THEN
            UPDATE medicine_batch
            SET stock_quantity = (
                  (stock_quantity * v_sub_units_per_unit) + stock_sub_quantity
                  + (v_sign * v_total_sub_units_change)
                ) / v_sub_units_per_unit,
                stock_sub_quantity = (
                  (stock_quantity * v_sub_units_per_unit) + stock_sub_quantity
                  + (v_sign * v_total_sub_units_change)
                ) % v_sub_units_per_unit
            WHERE batch_id = NEW.batch_id
            RETURNING stock_quantity, stock_sub_quantity
            INTO v_new_batch_qty, v_new_batch_sub_qty;

            -- Guard: prevent negative batch stock
            IF (v_new_batch_qty * v_sub_units_per_unit + v_new_batch_sub_qty) < 0 THEN
                RAISE EXCEPTION 'Negative stock prevented: batch % would go to % units + % sub-units',
                    NEW.batch_id, v_new_batch_qty, v_new_batch_sub_qty;
            END IF;
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        v_total_sub_units_change := (OLD.quantity * v_sub_units_per_unit) + COALESCE(OLD.sub_quantity, 0);

        UPDATE medicine
        SET stock_quantity = (
              (stock_quantity * v_sub_units_per_unit) + stock_sub_quantity
              - (v_sign * v_total_sub_units_change)
            ) / v_sub_units_per_unit,
            stock_sub_quantity = (
              (stock_quantity * v_sub_units_per_unit) + stock_sub_quantity
              - (v_sign * v_total_sub_units_change)
            ) % v_sub_units_per_unit
        WHERE medicine_id = v_medicine_id;

        IF OLD.batch_id IS NOT NULL THEN
            UPDATE medicine_batch
            SET stock_quantity = (
                  (stock_quantity * v_sub_units_per_unit) + stock_sub_quantity
                  - (v_sign * v_total_sub_units_change)
                ) / v_sub_units_per_unit,
                stock_sub_quantity = (
                  (stock_quantity * v_sub_units_per_unit) + stock_sub_quantity
                  - (v_sign * v_total_sub_units_change)
                ) % v_sub_units_per_unit
            WHERE batch_id = OLD.batch_id;
        END IF;

    ELSIF TG_OP = 'UPDATE' THEN
        -- Reverse old
        v_total_sub_units_change := (OLD.quantity * v_sub_units_per_unit) + COALESCE(OLD.sub_quantity, 0);
        UPDATE medicine
        SET stock_quantity = (
              (stock_quantity * v_sub_units_per_unit) + stock_sub_quantity
              - (v_sign * v_total_sub_units_change)
            ) / v_sub_units_per_unit,
            stock_sub_quantity = (
              (stock_quantity * v_sub_units_per_unit) + stock_sub_quantity
              - (v_sign * v_total_sub_units_change)
            ) % v_sub_units_per_unit
        WHERE medicine_id = v_medicine_id;

        IF OLD.batch_id IS NOT NULL THEN
            UPDATE medicine_batch
            SET stock_quantity = (
                  (stock_quantity * v_sub_units_per_unit) + stock_sub_quantity
                  - (v_sign * v_total_sub_units_change)
                ) / v_sub_units_per_unit,
                stock_sub_quantity = (
                  (stock_quantity * v_sub_units_per_unit) + stock_sub_quantity
                  - (v_sign * v_total_sub_units_change)
                ) % v_sub_units_per_unit
            WHERE batch_id = OLD.batch_id;
        END IF;

        -- Apply new
        v_total_sub_units_change := (NEW.quantity * v_sub_units_per_unit) + COALESCE(NEW.sub_quantity, 0);
        UPDATE medicine
        SET stock_quantity = (
              (stock_quantity * v_sub_units_per_unit) + stock_sub_quantity
              + (v_sign * v_total_sub_units_change)
            ) / v_sub_units_per_unit,
            stock_sub_quantity = (
              (stock_quantity * v_sub_units_per_unit) + stock_sub_quantity
              + (v_sign * v_total_sub_units_change)
            ) % v_sub_units_per_unit
        WHERE medicine_id = v_medicine_id;

        IF NEW.batch_id IS NOT NULL THEN
            UPDATE medicine_batch
            SET stock_quantity = (
                  (stock_quantity * v_sub_units_per_unit) + stock_sub_quantity
                  + (v_sign * v_total_sub_units_change)
                ) / v_sub_units_per_unit,
                stock_sub_quantity = (
                  (stock_quantity * v_sub_units_per_unit) + stock_sub_quantity
                  + (v_sign * v_total_sub_units_change)
                ) % v_sub_units_per_unit
            WHERE batch_id = NEW.batch_id
            RETURNING stock_quantity, stock_sub_quantity
            INTO v_new_batch_qty, v_new_batch_sub_qty;

            IF (v_new_batch_qty * v_sub_units_per_unit + v_new_batch_sub_qty) < 0 THEN
                RAISE EXCEPTION 'Negative stock prevented: batch % would go to % units + % sub-units',
                    NEW.batch_id, v_new_batch_qty, v_new_batch_sub_qty;
            END IF;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

COMMIT;
