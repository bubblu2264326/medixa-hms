export interface Medicine {
  id: number; // Standardized to match v_medicine_pos
  medicine_id?: number;
  brand_name: string;
  generic_name: string; // Critical for medical accuracy
  barcode: string;
  sku: string;
  price: number;
  stock_quantity: number;
  stock_sub_quantity: number;
  sub_unit: string;
  sub_units_per_unit: number;
  sub_unit_price: number;
  allow_sub_unit_sale: boolean;
  subQuantity?: number;
  batchNumber?: string;
  expiry_date?: string | Date;
  manufacturer?: string;
  dosage_value: number;
  dosage_unit: string;
  form: string;
  category: 'prescription' | 'otc' | 'controlled';
  requires_prescription?: boolean;

  // Batch specific fields from v_medicine_pos (merged at runtime)
  batch_id?: number;
  batch_number?: string;
  batch_code?: string;
  batch_stock_quantity?: number;
  batch_stock_sub_quantity?: number;
  batch_sale_price?: number;
  batch_sale_sub_unit_price?: number;
  global_price?: number;
  total_stock_quantity?: number;
  total_stock_sub_quantity?: number;
  min_stock_level?: number;
  is_low_stock?: boolean;
  is_out_of_stock?: boolean;
}

export type AvailabilityStatus =
  | 'available'
  | 'low_stock'
  | 'out_of_stock'
  | 'insufficient_stock'
  | 'override_selected'
  | 'fulfilled'
  | 'override_fulfilled'
  | 'not_fulfilled';

export type OverrideReasonCode =
  | 'purchased_from_other_store'
  | 'later_came_in_stock'
  | 'manual_local_arrangement'
  | 'other';

// Cart Item Types
export interface CartItem {
  id: string;
  medicine: Medicine;
  quantity: number;
  subQuantity: number;
  price: number;
  discountedPrice: number;
  discountPercent: number;
  customPrice?: number;
  lineTotal: number;
  batchId?: number;
  batchNumber?: string;
  batchCode?: string;
  saleId?: number;
  saleDetailId?: number;
  prescriptionMedicineId?: number;
  prescribedQuantity?: number;
  alreadyDispensedQuantity?: number;
  fulfillmentMode?: 'stock' | 'override';
  availabilityStatus?: AvailabilityStatus;
  availabilityNote?: string | null;
  availableQuantity?: number;
  isBillable?: boolean;
  isInventoryBacked?: boolean;
  overrideReasonCode?: OverrideReasonCode | null;
  overrideReasonNote?: string | null;
}

// Payment Types
export enum PaymentType {
  CASH = 'CASH',
  CARD = 'CARD',
  INSURANCE = 'INSURANCE',
  MOBILE = 'MOBILE',
  SPLIT = 'SPLIT'
}

export interface PaymentDetails {
  type: PaymentType;
  payableAmount: number;
  paidAmount: number;
  dueAmount: number;
  changeAmount: number;
  adjustment: number;
  adjustmentPercent: number;
  itemsDiscount: number;
  totalDiscount: number;
}

// Transaction Types
export type POSMode = 'SALE' | 'RETURN' | 'EDIT';

export interface Transaction {
  id: string;
  reference: string;
  items: CartItem[];
  payment: PaymentDetails;
  timestamp: Date;
  cashier: string;
  customer?: Customer;
  customerId?: number;
  status: 'completed' | 'pending' | 'cancelled' | 'held';
  mode: POSMode;
  ref_sale_id?: number; // Link to original sale for returns
  visitId?: number | null;
  billId?: number | null;
  prescriptionId?: number | null;
  patientId?: number | null;
  settlementMode?: 'collect_now' | 'append_to_bill';
}

export interface InvoiceSummary {
  id: string; // sale_id
  reference: string; // payment_reference
  timestamp: string; // sale_timestamp
  totalAmount: number; // total_amount
  itemsCount: number; // count(pharmacy_sale_detail)
  patientId: number | null; // visit.patient_id
  patientName: string | null; // patient.patient_name
  visitId: number | null; // sale.visit_id
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  prescriptionNumber?: string;
}

// UI State Types
export interface POSState {
  cart: CartItem[];
  payment: PaymentDetails;
  selectedItem: CartItem | null;
  searchQuery: string;
  isProcessing: boolean;
  currentTransaction?: Transaction;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface SearchResponse {
  medicines: Medicine[];
  total: number;
}

export interface PrescriptionSaleItem {
  prescriptionMedicineId: number;
  prescribedQuantity: number;
  alreadyDispensedQuantity: number;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
  medicine: Medicine;
  availableQuantity: number;
  availabilityStatus: AvailabilityStatus;
  availabilityNote?: string | null;
}

export interface PrescriptionUnavailableItem {
  prescriptionMedicineId: number;
  prescribedQuantity: number;
  alreadyDispensedQuantity: number;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
  medicine: Medicine;
  availableQuantity: number;
  availabilityStatus: 'out_of_stock' | 'insufficient_stock';
  availabilityNote?: string | null;
}

export interface PrescriptionSaleResponse {
  visitId: number;
  patientId: number;
  billId: number | null;
  prescriptionId: number;
  clinicNumber: string | number | null;
  visitType: string | null;
  status: string | null;
  availableItems: PrescriptionSaleItem[];
  unavailableItems: PrescriptionUnavailableItem[];
}

export interface PatientSearchResult {
  patient_id: number;
  patient_name: string;
  age: string | number | null;
  gender: string | null;
  cnic?: string | null;
  contact_number?: string | null;
  active_visit_count: number;
}

export interface ActiveVisitOption {
  visit_id: number;
  patient_id: number;
  clinic_number: string | number | null;
  visit_type: string;
  status: string;
  doctor_id: number;
  doctor_name: string;
  visit_timestamp: string;
  has_pending_prescription?: boolean;
}
