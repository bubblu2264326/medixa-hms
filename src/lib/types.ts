export interface Medicine {
  id: number;
  medicine_id?: number;
  generic_name: string;
  brand_name: string;
  category: string;
  dosage_value: number;
  dosage_unit: string;
  form: string;
  stock_quantity: number;
  stock_sub_quantity?: number;
  price: number;
  barcode?: string;
  sku?: string;
  manufacturer?: string;
  expiry_date?: string;
  min_stock_level: number;
  max_stock_level: number;
  is_active: boolean;
  requires_prescription: boolean;
  sub_unit?: string;
  sub_units_per_unit?: number;
  allow_sub_unit_sale?: boolean;

  // Batch specific fields
  batch_id?: number;
  batch_number?: string;
  batch_code?: string;
  batch_stock_quantity?: number;
  batch_stock_sub_quantity?: number;
  batch_sale_price?: number;
  batch_sale_sub_unit_price?: number;
  total_stock_quantity?: number;
  total_stock_sub_quantity?: number;
  is_low_stock?: boolean;
  is_out_of_stock?: boolean;
}

export interface CartItem {
  id?: string;
  medicine: Medicine;
  quantity: number;
  subQuantity: number;
  price: number;
  discountPercent: number;
  discountAmount: number;
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
  availabilityStatus?:
    | 'available'
    | 'low_stock'
    | 'out_of_stock'
    | 'insufficient_stock'
    | 'override_selected'
    | 'fulfilled'
    | 'override_fulfilled'
    | 'not_fulfilled';
  availabilityNote?: string | null;
  availableQuantity?: number;
  isBillable?: boolean;
  isInventoryBacked?: boolean;
  overrideReasonCode?: string | null;
  overrideReasonNote?: string | null;
}

export interface PaymentDetails {
  type: 'CASH' | 'CARD' | 'INSURANCE' | 'MOBILE' | 'SPLIT';
  payableAmount: number;
  paidAmount: number;
  dueAmount: number;
  changeAmount: number;
  adjustmentPercent: number;
  adjustment: number;
  itemsDiscount: number;
  totalDiscount: number;
}

export interface Transaction {
  reference: string;
  items: CartItem[];
  payment: PaymentDetails;
  cashier: string;
  customer?: {
    name?: string;
    phone?: string;
  };
  status: 'completed' | 'pending' | 'cancelled' | 'held';
  visitId?: number;
  billId?: number;
  customerId?: number;
  prescriptionId?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
}
