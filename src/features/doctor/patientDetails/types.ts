export type PatientInfo = {
  patient_id: string;
  patient_name: string;
  age: string | number | null;
  gender: string | null;
  cnic?: string | null;
  contact_number?: string | null;
  address?: string | null;
};

export type VisitInfo = {
  visit_id: string;
  patient_id: string;
  clinic_number: string | number | null;
  doctor_id: string;
  doctor_name?: string;
  visit_type: "OPD" | "Emergency";
  reason: string | null;
  status: string;
  visit_timestamp?: string;
};

export type DoctorProfile = {
  doctor_id: number;
  doctor_name: string;
  specialization: string;
  user_code: string;
  role: string;
};

export type PatientVitals = {
  visit_id: string;
  patient_id?: string;
  blood_pressure?: string;
  heart_rate?: string;
  temperature?: string;
  weight?: string;
  height?: string;
  blood_group?: string;
};

export type MenstrualHistorySummary = {
  menarch_age?: string | number | null;
  cycle_length_days?: string | number | null;
  bleeding_days?: string | number | null;
  menstrual_regular?: string | null;
  contraception_history?: string | null;
  gynecologic_surgeries?: string | null;
  medical_conditions?: string | null;
  menopause_status?: string | null;
  notes?: string | null;
};

export type ObstetricHistorySummary = {
  is_first_pregnancy?: string | null;
  married_years?: string | number | null;
  gravida?: string | number | null;
  para?: string | number | null;
  abortions?: string | number | null;
  edd?: string | null;
  last_menstrual_cycle?: string | null;
  notes?: string | null;
};

export type CurrentPregnancySummary = {
  multiple_pregnancy?: string | null;
  complications?: string | null;
  ultrasound_findings?: string | null;
  fetal_heart_rate_bpm?: string | number | null;
  placenta_position?: string | null;
  presentation?: string | null;
  gestational_age_weeks?: string | number | null;
  notes?: string | null;
};

export type WomenHealthSummary = {
  menstrualHistory?: MenstrualHistorySummary | null;
  obstetricHistory?: ObstetricHistorySummary | null;
  currentPregnancy?: CurrentPregnancySummary | null;
};

export type PatientContextSummary = {
  patient: PatientInfo;
  activeVisit: VisitInfo;
  capabilities?: {
    isQueueActive: boolean;
    canEditPrescriptions: boolean;
    canEditLabs: boolean;
    canSoftDeleteVisit: boolean;
    canAppendPrescription: boolean;
    shouldCreateNewPrescription: boolean;
    lockReason: string | null;
  };
  encounterNote: {
    visit_id: string | number;
    patient_id: string | number;
    doctor_id: string | number;
    reception_complaint: string | null;
    doctor_note: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  } | null;
  vitals: PatientVitals | null;
  womenHealthSummary: WomenHealthSummary | null;
};

export type RecentVisit = {
  visit_id: string;
  patient_id: string;
  patient_name: string;
  age: string | number | null;
  gender: string | null;
  clinic_number: string | number | null;
  doctor_name: string;
  status: string;
  reason: string | null;
  visit_type: string;
  visit_timestamp: string;
};

export type RecentPrescription = {
  prescription_id: string;
  order_date: string;
  category: string;
  generic_name: string;
  brand_name: string;
  dosage: string | null;
  form: string | null;
  prescribed_quantity: number;
  dispensed_quantity: number;
  frequency: string;
  duration: string;
  instructions: string | null;
  prescribed_by: string;
  dispensed_by: string | null;
};
