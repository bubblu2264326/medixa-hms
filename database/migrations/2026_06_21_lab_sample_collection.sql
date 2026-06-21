-- Lab Sample Collection step.
-- Adds specimen-collection traceability to lab_order and enables a 'Collected'
-- status between 'Pending' and 'Performed'. status is varchar(100) with no CHECK,
-- so the new value needs no enum change. Additive + safe.
ALTER TABLE lab_order
  ADD COLUMN IF NOT EXISTS sample_collected_at  timestamp without time zone,
  ADD COLUMN IF NOT EXISTS sample_collected_by  integer REFERENCES staff(staff_id),
  ADD COLUMN IF NOT EXISTS specimen_type        varchar(100);
