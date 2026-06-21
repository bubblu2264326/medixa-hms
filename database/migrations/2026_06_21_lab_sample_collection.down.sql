-- Down: remove the Sample Collection columns. Any rows left at status 'Collected'
-- should be moved back to 'Pending' before/after running this if rolling back.
ALTER TABLE lab_order
  DROP COLUMN IF EXISTS sample_collected_at,
  DROP COLUMN IF EXISTS sample_collected_by,
  DROP COLUMN IF EXISTS specimen_type;
