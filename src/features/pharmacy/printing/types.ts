export type ReceiptItem = {
  medicine_name: string;
  generic_name: string;
  qty: number | string;
  unit_price: number | string;
  discount_percent: number | string;
  total_price: number | string;
  is_override: boolean;
};

export type ReceiptTransaction = Record<string, any> & {
  sale_id: number;
  sale_timestamp?: string | Date | null;
  payment_reference?: string | null;
  staff_name?: string | null;
  patient_name?: string | null;
  total_amount?: string | number | null;
  paid_amount?: string | number | null;
  due_amount?: string | number | null;
  change_amount?: string | number | null;
  discount_amount?: string | number | null;
  discount_percent?: string | number | null;
  items: ReceiptItem[];
};

export type ReceiptConfig = Record<string, any> & {
  clinic_name?: string | null;
  clinic_address?: string | null;
  clinic_phone?: string | null;
  receipt_header?: string | null;
  receipt_footer?: string | null;
  paper_size?: string | null;
};

export interface ReceiptPayload {
  config: ReceiptConfig;
  transaction: ReceiptTransaction;
}

export type PrintMode = 'browser' | 'silent_qz';

export interface PrinterSettings {
  mode: PrintMode;
  autoPrint: boolean;
  qzPrinterName: string;
}

