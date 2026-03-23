BEGIN;

CREATE OR REPLACE VIEW public.admin_cash_collected_ledger_v1 AS
SELECT
  txn.created_at AS collected_at,
  CASE
    WHEN txn.txn_type = 'payment' THEN txn.amount
    WHEN txn.txn_type = 'reversal' THEN -ABS(txn.amount)
    ELSE 0
  END::numeric AS amount,
  'cashier'::text AS source,
  CONCAT('cashier_payment_txn:', txn.cashier_payment_txn_id)::text AS entity_ref
FROM public.cashier_payment_txn txn
WHERE txn.txn_type IN ('payment', 'reversal')

UNION ALL

SELECT
  sale.sale_timestamp AS collected_at,
  sale.total_amount::numeric AS amount,
  'pharmacy'::text AS source,
  CONCAT('pharmacy_sale:', sale.sale_id)::text AS entity_ref
FROM public.pharmacy_sale sale
WHERE sale.settlement_channel = 'pharmacy'
  AND sale.settlement_status = 'settled';

COMMENT ON VIEW public.admin_cash_collected_ledger_v1 IS
  'Normalized cash collected ledger for admin dashboard trends and totals (cashier net + pharmacy counter settled; anti-double-count by channel).';

COMMIT;
