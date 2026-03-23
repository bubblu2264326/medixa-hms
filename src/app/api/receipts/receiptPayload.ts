import { query } from '@/database/db';

export type ReceiptItemRow = {
  medicine_name: string;
  generic_name: string;
  qty: number | string;
  unit_price: number | string;
  discount_percent: number | string;
  total_price: number | string;
  is_override: boolean;
};

export type ReceiptTransactionRow = Record<string, any> & {
  sale_id: number;
  payment_reference?: string | null;
  sale_timestamp?: string | Date | null;
  staff_name?: string | null;
  patient_name?: string | null;
  items?: ReceiptItemRow[];
};

export type ReceiptConfigRow = Record<string, any> & {
  clinic_name?: string | null;
  clinic_address?: string | null;
  clinic_phone?: string | null;
  receipt_header?: string | null;
  receipt_footer?: string | null;
  paper_size?: string | null;
};

export interface ReceiptPayload {
  config: ReceiptConfigRow;
  transaction: ReceiptTransactionRow;
}

export async function getReceiptPayload(transactionId: number | string): Promise<ReceiptPayload | null> {
  const saleId = Number(transactionId);
  if (!Number.isFinite(saleId) || saleId <= 0) {
    return null;
  }

  const saleResult = await query(
    `
      SELECT
        ps.*,
        s.name as staff_name,
        p.patient_name
      FROM pharmacy_sale ps
      LEFT JOIN staff s ON ps.handled_by = s.staff_id
      LEFT JOIN visit v ON ps.visit_id = v.visit_id
      LEFT JOIN patient p ON v.patient_id = p.patient_id
      WHERE ps.sale_id = $1
      GROUP BY ps.sale_id, s.name, p.patient_name
    `,
    [saleId]
  );

  if (saleResult.rows.length === 0) {
    return null;
  }

  const transaction: ReceiptTransactionRow = saleResult.rows[0];

  const detailItemsResult = await query(
    `
      SELECT
        m.brand_name as medicine_name,
        m.generic_name,
        psd.quantity as qty,
        psd.unit_sale_price as unit_price,
        psd.discount_percent,
        psd.line_total as total_price,
        (
          psd.batch_id IS NULL
          AND (
            psd.prescription_medicine_id IS NOT NULL
            OR psd.reason_code IS NOT NULL
            OR psd.reason_note IS NOT NULL
          )
        ) as is_override
      FROM pharmacy_sale_detail psd
      JOIN medicine m ON psd.medicine_id = m.medicine_id
      WHERE psd.sale_id = $1
    `,
    [saleId]
  );

  transaction.items = detailItemsResult.rows;

  const configResult = await query(
    `
      SELECT *
      FROM pos_receipt_config
      WHERE is_active = true
      LIMIT 1
    `
  );

  const config: ReceiptConfigRow = configResult.rows[0] || {
    clinic_name: 'Pharmacy',
    clinic_address: '',
    clinic_phone: '',
    receipt_header: '',
    receipt_footer: 'Thank you for your visit!',
    paper_size: '80mm',
  };

  return { config, transaction };
}

