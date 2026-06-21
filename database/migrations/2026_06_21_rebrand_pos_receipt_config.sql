-- Rebrand: clinic_name -> product name "Medixa".
-- The app UI and seed data were updated to "Medixa"; this aligns the live
-- pos_receipt_config row so DB-driven receipts/config screens match. Idempotent.
UPDATE public.pos_receipt_config
SET clinic_name = 'Medixa'
WHERE config_id = 1
  AND clinic_name = 'Dr Fauzia Ishaq Clinic';
