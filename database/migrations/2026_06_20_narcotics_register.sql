-- Phase 4: controlled-drug (narcotics) register for DRAP compliance.
-- Flags controlled medicines and exposes a chronological movement register
-- (dispenses out, returns in) over the existing pharmacy sale/return detail.

ALTER TABLE medicine ADD COLUMN IF NOT EXISTS is_controlled boolean NOT NULL DEFAULT false;
ALTER TABLE medicine ADD COLUMN IF NOT EXISTS controlled_schedule varchar(20);
CREATE INDEX IF NOT EXISTS idx_medicine_controlled ON medicine(medicine_id) WHERE is_controlled;

CREATE OR REPLACE VIEW v_narcotics_register AS
SELECT
  psd.created_at                       AS movement_at,
  'dispense'::text                     AS movement_type,
  m.medicine_id, m.generic_name, m.brand_name, m.controlled_schedule,
  psd.batch_id,
  psd.quantity                         AS qty_units,
  COALESCE(psd.sub_quantity, 0)        AS qty_sub_units,
  s.sale_id,
  s.visit_id,
  s.handled_by                         AS staff_id
FROM pharmacy_sale_detail psd
JOIN medicine m ON m.medicine_id = psd.medicine_id AND m.is_controlled
JOIN pharmacy_sale s ON s.sale_id = psd.sale_id
UNION ALL
SELECT
  sr.return_timestamp                  AS movement_at,
  'return'::text                       AS movement_type,
  m.medicine_id, m.generic_name, m.brand_name, m.controlled_schedule,
  srd.batch_id,
  srd.returned_quantity                AS qty_units,
  COALESCE(srd.returned_sub_quantity, 0) AS qty_sub_units,
  sr.sale_id,
  NULL::integer                        AS visit_id,
  sr.created_by                        AS staff_id
FROM sale_return_detail srd
JOIN medicine m ON m.medicine_id = srd.medicine_id AND m.is_controlled
JOIN sale_return sr ON sr.return_id = srd.return_id;
