-- Phase 4: appointment scheduling. Layered over the existing walk-in/queue flow
-- (appointments are optional — OPD stays walk-in-first). An appointment is a
-- planned slot for a patient with a doctor; arriving can later spawn a visit.

CREATE TABLE IF NOT EXISTS appointment (
  appointment_id  serial PRIMARY KEY,
  patient_id      integer NOT NULL REFERENCES patient(patient_id),
  doctor_id       integer NOT NULL REFERENCES doctor(doctor_id),
  scheduled_at    timestamp NOT NULL,
  duration_min    integer NOT NULL DEFAULT 15,
  status          varchar(15) NOT NULL DEFAULT 'booked',
  reason          text,
  visit_id        integer REFERENCES visit(visit_id),
  created_by      integer REFERENCES staff(staff_id),
  created_at      timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_appointment_status CHECK (status IN
    ('booked','confirmed','arrived','completed','cancelled','no_show')),
  CONSTRAINT ck_appointment_duration CHECK (duration_min > 0)
);
CREATE INDEX IF NOT EXISTS idx_appointment_doctor_time ON appointment(doctor_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointment_patient ON appointment(patient_id);

-- a doctor can't hold two ACTIVE bookings for the exact same slot
CREATE UNIQUE INDEX IF NOT EXISTS uq_appointment_active_slot
  ON appointment(doctor_id, scheduled_at)
  WHERE status NOT IN ('cancelled', 'no_show');
