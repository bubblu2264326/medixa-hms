export interface QueueItem {
  patient_id: string | number;
  visit_id: string | number;
  patient_name: string;
  clinic_number: string;
  doctor_id?: string;
  doctor_name: string;
  status?: string;
  visit_type: "OPD" | "Emergency" | "Other";
  bill_id?: string | number | null;
  payment_status?: "Unpaid" | "Partial" | "Paid" | null;
  due_amount?: number | null;
}
