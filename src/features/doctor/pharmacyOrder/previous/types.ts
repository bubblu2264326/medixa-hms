
export type Prescription = {
  visit_id: string | number;
  visit_timestamp?: string;
  prescription_id?: string | number;
  prescription_medicine_id?: string | number;
  order_date: string;
  category: string;
  generic_name: string;
  brand_name: string;
  dosage: string | null;
  instructions: string;
  prescribed_quantity: number;
  dispensed_quantity: number;
  frequency: number | string;
  duration: string;
  unit: string;
  prescribed_by: string;
  dispensed_by: string;
  form: string;
};
