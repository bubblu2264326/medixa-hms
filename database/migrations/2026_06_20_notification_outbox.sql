-- Phase 4: notification outbox (WhatsApp/SMS/email). The app ENQUEUES messages
-- here; a gateway worker delivers them. Live delivery needs a configured gateway
-- (JazzCash/Twilio/WhatsApp Business API) — credentials are environment config,
-- not code, so this ships the durable outbox + enqueue path; the sender is
-- pluggable (a stub marks 'sent' until a real gateway is wired).

CREATE TABLE IF NOT EXISTS notification_outbox (
  notification_id  serial PRIMARY KEY,
  channel          varchar(15) NOT NULL,
  recipient        varchar(120) NOT NULL,
  template         varchar(60) NOT NULL,
  payload          jsonb,
  status           varchar(12) NOT NULL DEFAULT 'queued',
  related_entity   varchar(80),
  error            text,
  attempts         integer NOT NULL DEFAULT 0,
  created_at       timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at          timestamp,
  CONSTRAINT ck_notif_channel CHECK (channel IN ('sms','whatsapp','email')),
  CONSTRAINT ck_notif_status CHECK (status IN ('queued','sent','failed'))
);
CREATE INDEX IF NOT EXISTS idx_notif_status ON notification_outbox(status) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_notif_created ON notification_outbox(created_at DESC);
