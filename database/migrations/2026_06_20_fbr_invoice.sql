-- Phase 4: FBR / PRAL digital-invoicing submission queue (Pakistan compliance).
-- The app enqueues a bill for FBR submission; a PRAL-integrated worker submits it
-- and writes back the FBR 22-digit invoice number + QR. Live submission needs a
-- PRAL token (env config), so this ships the durable queue + enqueue/readback
-- path; the submitter is pluggable.

CREATE TABLE IF NOT EXISTS fbr_invoice_submission (
  submission_id       serial PRIMARY KEY,
  bill_id             integer NOT NULL REFERENCES bill(bill_id),
  status              varchar(12) NOT NULL DEFAULT 'queued',
  fbr_invoice_number  varchar(40),
  qr_payload          text,
  error               text,
  attempts            integer NOT NULL DEFAULT 0,
  created_at          timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at        timestamp,
  CONSTRAINT ck_fbr_status CHECK (status IN ('queued','submitted','failed'))
);
-- one live submission per bill (a bill is submitted once; re-submit reuses the row)
CREATE UNIQUE INDEX IF NOT EXISTS uq_fbr_bill ON fbr_invoice_submission(bill_id);
CREATE INDEX IF NOT EXISTS idx_fbr_status ON fbr_invoice_submission(status) WHERE status = 'queued';
