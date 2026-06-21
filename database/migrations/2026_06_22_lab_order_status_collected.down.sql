-- Revert to the prior (narrower) lab_order status set. NOTE: will fail if any
-- rows are currently in 'Collected' — collect/clear those first.
ALTER TABLE lab_order DROP CONSTRAINT IF EXISTS lab_order_status_check;
ALTER TABLE lab_order ADD CONSTRAINT lab_order_status_check
  CHECK (status::text = ANY (ARRAY['Pending','Performed','Completed']::text[]));
