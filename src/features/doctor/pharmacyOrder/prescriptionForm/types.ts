export type MedicineSearchResult = {
  medicine_id: string;
  generic_name: string;
  brand_name: string;
  category: string;
  dosage_value: number;
  dosage_unit: string;
  form: string;
  manufacturer?: string;
  stock_quantity?: number;
  price?: number;
  available_quantity?: number;
  availability_status?: "available" | "low_stock" | "out_of_stock";
  availability_note?: string;
};

export const FREQUENCY_OPTIONS = ["OD", "BD", "TID", "QID"] as const;
export const FREQUENCY_LABELS: Record<(typeof FREQUENCY_OPTIONS)[number], string> = {
  OD: "Once daily (OD)",
  BD: "Twice daily (BD)",
  TID: "Three times daily (TID)",
  QID: "Four times daily (QID)",
};
export const DURATION_UNIT_OPTIONS = ["days", "weeks", "months"] as const;

export type FrequencyOption = (typeof FREQUENCY_OPTIONS)[number];
export type DurationUnitOption = (typeof DURATION_UNIT_OPTIONS)[number];

export type SelectedPrescriptionMedicine = {
  medicine_id: string;
  generic_name: string;
  brand_name: string;
  category: string;
  form: string;
  dosage: string;
  instructions: string;
  prescribed_quantity: number;
  dispensed_quantity: number;
  frequency: FrequencyOption | "";
  duration_value: number | null;
  duration_unit: DurationUnitOption | "";
  available_quantity?: number;
  availability_status?: "available" | "low_stock" | "out_of_stock" | "insufficient_stock";
  availability_note?: string;
};

export type FormValues = {
  prescriptions: SelectedPrescriptionMedicine[];
};

export type AllergyWarning = {
  medicine_id: number;
  drug: string;
  allergen: string;
  severity: string;
};
