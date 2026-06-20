-- IPD module — migration 3 of 3: inpatient billing (advances, charges, final bill).
--
-- The inpatient bill is a RUNNING account on the admission: charges accrue
-- (room rent, nursing, doctor visits, posted services/pharmacy/procedures) and
-- advances are collected; balance = charges - advances. v_ip_running_bill
-- exposes the live total. Room-rent accrual is time-based (days x bed rate),
-- so it is posted by a backend helper on bill-view/discharge (a row trigger
-- cannot accrue across calendar days) — this migration provides the tables it
-- writes into.

-- advances / deposits collected against an admission --------------------------
CREATE TABLE IF NOT EXISTS ip_advance (
  advance_id    serial PRIMARY KEY,
  admission_id  integer NOT NULL REFERENCES admission(admission_id) ON DELETE CASCADE,
  amount        numeric NOT NULL,
  payment_type  varchar(20) NOT NULL DEFAULT 'CASH',
  receipt_no    varchar(60),
  received_by   integer REFERENCES staff(staff_id),
  received_at   timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes         text,
  created_at    timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_ip_advance_amount_pos CHECK (amount > 0),
  CONSTRAINT ck_ip_advance_payment_type CHECK (payment_type IN ('CASH','CARD','INSURANCE','MOBILE','SPLIT'))
);
CREATE INDEX IF NOT EXISTS idx_ip_advance_admission ON ip_advance(admission_id);

-- running charges posted to an admission --------------------------------------
CREATE TABLE IF NOT EXISTS ip_charge (
  charge_id     serial PRIMARY KEY,
  admission_id  integer NOT NULL REFERENCES admission(admission_id) ON DELETE CASCADE,
  charge_type   varchar(20) NOT NULL,
  description   text,
  qty           numeric NOT NULL DEFAULT 1,
  unit_rate     numeric NOT NULL DEFAULT 0,
  amount        numeric NOT NULL,
  source_ref    varchar(80),
  posted_by     integer REFERENCES staff(staff_id),
  posted_at     timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at    timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_ip_charge_type CHECK (charge_type IN
    ('room_rent','nursing','doctor_visit','service','pharmacy','procedure','consumable','lab','adjustment','other')),
  CONSTRAINT ck_ip_charge_qty_nonneg CHECK (qty >= 0),
  CONSTRAINT ck_ip_charge_rate_nonneg CHECK (unit_rate >= 0)
  -- amount is intentionally unconstrained in sign: 'adjustment' lines may be negative.
);
CREATE INDEX IF NOT EXISTS idx_ip_charge_admission ON ip_charge(admission_id);
-- one room_rent line per admission per source_ref (bed stint) — lets the accrual
-- helper upsert idempotently as the stay lengthens.
CREATE UNIQUE INDEX IF NOT EXISTS uq_ip_charge_room_rent
  ON ip_charge(admission_id, source_ref) WHERE charge_type = 'room_rent';

-- final bill at discharge -----------------------------------------------------
CREATE TABLE IF NOT EXISTS ip_final_bill (
  admission_id     integer PRIMARY KEY REFERENCES admission(admission_id) ON DELETE CASCADE,
  gross_amount     numeric NOT NULL DEFAULT 0,
  discount_amount  numeric NOT NULL DEFAULT 0,
  advance_adjusted numeric NOT NULL DEFAULT 0,
  net_due          numeric NOT NULL DEFAULT 0,
  settled          boolean NOT NULL DEFAULT false,
  settled_at       timestamp,
  settled_by       integer REFERENCES staff(staff_id),
  gate_pass_no     varchar(60),
  created_at       timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_ip_final_nonneg CHECK (gross_amount >= 0 AND discount_amount >= 0 AND advance_adjusted >= 0)
);

-- live running-bill view ------------------------------------------------------
CREATE OR REPLACE VIEW v_ip_running_bill AS
SELECT
  a.admission_id,
  a.admission_no,
  a.patient_id,
  a.status,
  COALESCE((SELECT SUM(c.amount) FROM ip_charge  c WHERE c.admission_id = a.admission_id), 0) AS total_charges,
  COALESCE((SELECT SUM(v.amount) FROM ip_advance v WHERE v.admission_id = a.admission_id), 0) AS total_advances,
  COALESCE((SELECT SUM(c.amount) FROM ip_charge  c WHERE c.admission_id = a.admission_id), 0)
  - COALESCE((SELECT SUM(v.amount) FROM ip_advance v WHERE v.admission_id = a.admission_id), 0) AS balance_due
FROM admission a;
