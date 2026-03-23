export type DashboardSummary = {
  assigned_total: number;
  waiting_total: number;
  checked_total: number;
  other_progressed_total: number;
};

export type CheckedPatientRow = {
  visit_id: number;
  patient_id: number;
  patient_name: string;
  age: number | null;
  gender: string | null;
  clinic_number: number | null;
  visit_type: string;
  current_status: string;
  reason: string | null;
  visit_timestamp: string;
  seen_at: string;
  checked_at: string;
  history_count: number;
};

export type HistoryVisit = {
  visit_id: number;
  patient_id: number;
  patient_name: string;
  age: number | null;
  gender: string | null;
  clinic_number: number | null;
  visit_type: string;
  status: string;
  reason: string | null;
  visit_timestamp: string;
  last_checked_by_doctor_name?: string | null;
};

export type VisitHistoryEntry = {
  visit_status_id: number;
  status: string;
  updated_by_doctor: number | null;
  updated_by_staff: number | null;
  updated_by_doctor_name?: string | null;
  updated_by_staff_name?: string | null;
  updated_at: string;
};

export type VisitHistoryResponse = {
  visit: HistoryVisit;
  history: VisitHistoryEntry[];
};
