-- Fix: allow the 'Collected' lab_order status.
-- The sample-collection feature sets status='Collected', but lab_order has a
-- CHECK constraint (lab_order_status_check) that only permitted
-- Pending/Performed/Completed — so sample collection failed with a constraint
-- violation on any DB carrying that constraint. Widen it to include 'Collected'.
ALTER TABLE lab_order DROP CONSTRAINT IF EXISTS lab_order_status_check;
ALTER TABLE lab_order ADD CONSTRAINT lab_order_status_check
  CHECK (status::text = ANY (ARRAY['Pending','Collected','Performed','Completed']::text[]));
