-- Revert rebrand of pos_receipt_config.clinic_name.
UPDATE public.pos_receipt_config
SET clinic_name = 'Dr Fauzia Ishaq Clinic'
WHERE config_id = 1
  AND clinic_name = 'Medixa';
