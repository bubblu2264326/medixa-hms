import {
  DoctorProfile,
  PatientContextSummary,
  RecentPrescription,
  RecentVisit,
} from "./types";

export async function fetchDoctorProfile(): Promise<DoctorProfile> {
  const res = await fetch("/api/doctor/me");
  if (!res.ok) throw new Error("Failed to fetch doctor profile");
  return res.json();
}

export async function fetchPatientContextSummary(
  _patientId: string,
  visitId: string
): Promise<PatientContextSummary> {
  const res = await fetch(`/api/doctor/visit/${visitId}`);
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || "Failed to fetch patient context");
  }
  return res.json();
}

export async function saveDoctorEncounterNote(
  visitId: string,
  doctor_note: string
): Promise<PatientContextSummary["encounterNote"]> {
  const res = await fetch(`/api/doctor/encounter/${visitId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ doctor_note }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || "Failed to save doctor note");
  }

  return res.json();
}

export async function updateVisitStatus(
  visitId: string,
  status: string
): Promise<{ visit: { status: string } }> {
  const res = await fetch(`/api/doctor/visit/${visitId}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || "Failed to update visit status");
  }

  return res.json();
}

export async function softDeleteVisit(
  visitId: string
): Promise<{ visit: { is_deleted: boolean; status: string } }> {
  const res = await fetch(`/api/doctor/visit/${visitId}/soft-delete`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || "Failed to soft delete visit");
  }

  return res.json();
}

export async function fetchPastVisits(patientId: string): Promise<RecentVisit[]> {
  const res = await fetch(`/api/doctor/history/patient/${patientId}/visits`);
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || "Failed to fetch visit history");
  }

  return res.json();
}

export async function fetchPreviousPrescriptions(
  patientId: string
): Promise<RecentPrescription[]> {
  const res = await fetch(`/api/doctor/history/patient/${patientId}/prescriptions`);
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || "Failed to fetch prescription history");
  }

  return res.json();
}
