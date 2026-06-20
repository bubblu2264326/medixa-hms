// features/reception/appointments/api.ts
import { Appointment, AppointmentStatus, BookAppointmentPayload, Doctor, PatientHit } from "./types";

export async function fetchDoctors(): Promise<Doctor[]> {
  const res = await fetch("/api/doctor/getAllDoctors");
  if (!res.ok) throw new Error("Failed to fetch doctors");
  return res.json();
}

export async function searchPatients(q: string): Promise<PatientHit[]> {
  const res = await fetch(`/api/patient/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error("Failed to search patients");
  return res.json();
}

export async function fetchAppointments(date: string, doctorId?: string): Promise<Appointment[]> {
  const params = new URLSearchParams({ date });
  if (doctorId) params.set("doctor_id", doctorId);
  const res = await fetch(`/api/appointments?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to load appointments");
  return res.json();
}

export type BookResult =
  | { ok: true; appointment_id: number }
  | { ok: false; status: number; error: string };

export async function bookAppointment(payload: BookAppointmentPayload): Promise<BookResult> {
  const res = await fetch("/api/appointments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok) return { ok: true, appointment_id: data.appointment_id };
  return { ok: false, status: res.status, error: data?.error || "Failed to book appointment" };
}

export async function updateAppointmentStatus(
  appointmentId: number,
  status: AppointmentStatus
): Promise<boolean> {
  const res = await fetch(`/api/appointments/${appointmentId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return res.ok;
}
