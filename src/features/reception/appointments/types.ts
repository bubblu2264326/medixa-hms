// features/reception/appointments/types.ts
export type Doctor = {
  doctor_id: string;
  doctor_name: string;
};

export type PatientHit = {
  patient_id: string;
  patient_name: string;
  age: string;
  gender: string;
  cnic?: string;
};

// Lifecycle statuses accepted by PATCH /api/appointments/[id].
export type AppointmentStatus =
  | "booked"
  | "confirmed"
  | "arrived"
  | "completed"
  | "cancelled"
  | "no_show";

export type Appointment = {
  appointment_id: number;
  patient_id: number;
  patient_name: string;
  doctor_id: number;
  doctor_name: string;
  scheduled_at: string;
  duration_min: number;
  status: AppointmentStatus;
  reason: string | null;
  visit_id: number | null;
};

export type BookAppointmentPayload = {
  patient_id: string;
  doctor_id: string;
  scheduled_at: string;
  duration_min?: number;
  reason?: string;
};
