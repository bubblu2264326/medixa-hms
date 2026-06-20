import pool from "@/database/db";
import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";
import { NextRequest, NextResponse } from "next/server";

type ReturnItemPayload = {
  sale_id: number;
  sale_detail_id: number;
  medicine_id: number;
  prescription_medicine_id?: number | null;
  quantity: number;
  sub_quantity?: number;
  unit_sale_price: number;
  sub_unit_sale_price?: number;
  batch_id?: number | null;
  reason_code?: string | null;
  reason_note?: string | null;
};

type OutstandingSaleDetailRow = {
  pharmacy_sale_detail_id: number;
  sale_id: number;
  medicine_id: number;
  quantity: number;
  sub_quantity: number;
  unit_sale_price: number;
  sub_unit_sale_price: number;
  batch_id: number | null;
  prescription_medicine_id: number | null;
  reason_code: string | null;
  reason_note: string | null;
  available_quantity_snapshot: number | null;
  availability_status: string | null;
  sold_total_sub_units: number;
  returned_total_sub_units: number;
  sub_units_per_unit: number;
};

function normalizeReturnItems(items: unknown): ReturnItemPayload[] {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Return must contain at least one item");
  }

  return items.map((item) => {
    const candidate = item as Record<string, unknown>;
    return {
      sale_id: Number(candidate.sale_id),
      sale_detail_id: Number(candidate.sale_detail_id),
      medicine_id: Number(candidate.medicine_id),
      prescription_medicine_id: candidate.prescription_medicine_id ? Number(candidate.prescription_medicine_id) : null,
      quantity: Number(candidate.quantity ?? candidate.dispensed_quantity ?? 0),
      sub_quantity: Number(candidate.sub_quantity ?? 0),
      unit_sale_price: Number(candidate.unit_sale_price ?? candidate.unit_price ?? 0),
      sub_unit_sale_price: Number(candidate.sub_unit_sale_price ?? 0),
      batch_id: candidate.batch_id ? Number(candidate.batch_id) : null,
      reason_code: typeof candidate.reason_code === "string" ? candidate.reason_code : null,
      reason_note: typeof candidate.reason_note === "string" ? candidate.reason_note : null,
    };
  });
}

function getAvailabilityStatus(availableQuantity: number) {
  if (availableQuantity <= 0) {
    return "out_of_stock";
  }

  if (availableQuantity <= 5) {
    return "low_stock";
  }

  return "available";
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const client = await pool.connect();

  try {
    await getAuthenticatedUser(req);
    await client.query("BEGIN");

    const { reason, created_by } = body;
    const items = normalizeReturnItems(body.items);
    const saleIds = new Set(items.map((item) => item.sale_id).filter(Boolean));

    if (saleIds.size !== 1) {
      throw new Error("All returned items must belong to the same sale");
    }

    const saleId = items[0].sale_id;

    const saleDetailIds = items.map((item) => item.sale_detail_id);
    const saleDetailResult = await client.query(
      `
        WITH returned_totals AS (
          SELECT
            sr.sale_id,
            srd.medicine_id,
            srd.batch_id,
            COALESCE(SUM((srd.returned_quantity * COALESCE(NULLIF(m.sub_units_per_unit, 0), 1)) + COALESCE(srd.returned_sub_quantity, 0)), 0) AS returned_total_sub_units
          FROM sale_return sr
          JOIN sale_return_detail srd ON srd.return_id = sr.return_id
          JOIN medicine m ON m.medicine_id = srd.medicine_id
          WHERE sr.sale_id = $1
          GROUP BY sr.sale_id, srd.medicine_id, srd.batch_id
        )
        SELECT
          psd.pharmacy_sale_detail_id,
          psd.sale_id,
          psd.medicine_id,
          psd.quantity,
          COALESCE(psd.sub_quantity, 0) AS sub_quantity,
          COALESCE(psd.unit_sale_price, 0) AS unit_sale_price,
          COALESCE(psd.sub_unit_sale_price, 0) AS sub_unit_sale_price,
          psd.batch_id,
          psd.prescription_medicine_id,
          psd.reason_code,
          psd.reason_note,
          pm.available_quantity_snapshot,
          pm.availability_status,
          COALESCE(NULLIF(m.sub_units_per_unit, 0), 1) AS sub_units_per_unit,
          ((psd.quantity * COALESCE(NULLIF(m.sub_units_per_unit, 0), 1)) + COALESCE(psd.sub_quantity, 0)) AS sold_total_sub_units,
          COALESCE(rt.returned_total_sub_units, 0) AS returned_total_sub_units
        FROM pharmacy_sale_detail psd
        JOIN medicine m ON m.medicine_id = psd.medicine_id
        LEFT JOIN prescription_medicines pm ON pm.prescription_medicine_id = psd.prescription_medicine_id
        LEFT JOIN returned_totals rt
          ON rt.sale_id = psd.sale_id
         AND rt.medicine_id = psd.medicine_id
         AND (
           (rt.batch_id IS NULL AND psd.batch_id IS NULL)
           OR rt.batch_id = psd.batch_id
         )
        WHERE psd.sale_id = $1
          AND psd.pharmacy_sale_detail_id = ANY($2::int[])
        FOR UPDATE
      `,
      [saleId, saleDetailIds]
    );

    const outstandingById = new Map<number, OutstandingSaleDetailRow>(
      saleDetailResult.rows.map((row) => [Number(row.pharmacy_sale_detail_id), row as OutstandingSaleDetailRow])
    );

    if (outstandingById.size !== saleDetailIds.length) {
      throw new Error("One or more return items no longer exist on the sale");
    }

    // M3: capture the monetary refund for this return so it nets against
    // revenue (mirrors the per-item detail values inserted below). refund_method
    // defaults to CASH (this clinical return path carries no tender selection).
    const refundAmount = Math.round(
      items.reduce((sum: number, item: any) => {
        const sourceRow = outstandingById.get(item.sale_detail_id);
        const unitPrice = Number(item.unit_sale_price ?? sourceRow?.unit_sale_price ?? 0);
        const subPrice = Number(item.sub_unit_sale_price ?? sourceRow?.sub_unit_sale_price ?? 0);
        return sum + Number(item.quantity || 0) * unitPrice + Number(item.sub_quantity || 0) * subPrice;
      }, 0) * 100
    ) / 100;

    const returnRes = await client.query(
      `INSERT INTO sale_return (sale_id, reason, return_timestamp, created_by, refund_amount)
       VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4)
       RETURNING return_id`,
      [saleId, reason, created_by, refundAmount]
    );
    const return_id = returnRes.rows[0].return_id;

    for (const item of items) {
      const sourceRow = outstandingById.get(item.sale_detail_id);

      if (!sourceRow) {
        throw new Error(`Sale detail ${item.sale_detail_id} is not returnable`);
      }

      const requestedSubUnits =
        (Number(item.quantity || 0) * Number(sourceRow.sub_units_per_unit || 1)) +
        Number(item.sub_quantity || 0);
      const remainingSubUnits = Number(sourceRow.sold_total_sub_units || 0) - Number(sourceRow.returned_total_sub_units || 0);

      if (requestedSubUnits <= 0) {
        throw new Error("Return quantity must be greater than zero");
      }

      if (requestedSubUnits > remainingSubUnits) {
        throw new Error(`Return quantity exceeds remaining quantity for sale detail ${item.sale_detail_id}`);
      }

      await client.query(
        `
          INSERT INTO sale_return_detail (
            return_id,
            medicine_id,
            returned_quantity,
            returned_unit_price,
            batch_id,
            returned_sub_quantity,
            returned_sub_unit_price
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          return_id,
          sourceRow.medicine_id,
          item.quantity,
          item.unit_sale_price || sourceRow.unit_sale_price,
          sourceRow.batch_id,
          item.sub_quantity || 0,
          item.sub_unit_sale_price || sourceRow.sub_unit_sale_price || 0,
        ]
      );

      if (sourceRow.prescription_medicine_id) {
        const isOverride = sourceRow.batch_id === null && (
          sourceRow.reason_code !== null ||
          sourceRow.reason_note !== null
        );
        const nextAvailableQuantity = isOverride
          ? Number(sourceRow.available_quantity_snapshot || 0)
          : Math.max(Number(sourceRow.available_quantity_snapshot || 0) + Number(item.quantity || 0), 0);
        const nextAvailabilityStatus = getAvailabilityStatus(nextAvailableQuantity);

        await client.query(
          `
            UPDATE prescription_medicines
            SET
              dispensed_quantity = GREATEST(COALESCE(dispensed_quantity, 0) - $1, 0),
              dispensed_by = CASE WHEN COALESCE(dispensed_quantity, 0) - $1 <= 0 THEN NULL ELSE dispensed_by END,
              dispensed_at = CASE WHEN COALESCE(dispensed_quantity, 0) - $1 <= 0 THEN NULL ELSE dispensed_at END,
              updated_at = CURRENT_TIMESTAMP,
              available_quantity_snapshot = $3,
              availability_status = $4
            WHERE prescription_medicine_id = $2
          `,
          [
            item.quantity,
            sourceRow.prescription_medicine_id,
            nextAvailableQuantity,
            nextAvailabilityStatus,
          ]
        );
      }

      await client.query(
        `DELETE FROM bill_item
         WHERE bill_id = (SELECT bill_id FROM pharmacy_sale WHERE sale_id = $1)
           AND description = (SELECT brand_name FROM medicine WHERE medicine_id = $2)
           AND amount = $3`,
        [saleId, sourceRow.medicine_id, Number(item.unit_sale_price || sourceRow.unit_sale_price) * Number(item.quantity || 0)]
      );
    }

    const checkRes = await client.query(
      `
        WITH sale_totals AS (
          SELECT
            COALESCE(SUM((psd.quantity * COALESCE(NULLIF(m.sub_units_per_unit, 0), 1)) + COALESCE(psd.sub_quantity, 0)), 0) AS sold_total_sub_units
          FROM pharmacy_sale_detail psd
          JOIN medicine m ON m.medicine_id = psd.medicine_id
          WHERE psd.sale_id = $1
        ),
        return_totals AS (
          SELECT
            COALESCE(SUM((srd.returned_quantity * COALESCE(NULLIF(m.sub_units_per_unit, 0), 1)) + COALESCE(srd.returned_sub_quantity, 0)), 0) AS returned_total_sub_units
          FROM sale_return sr
          JOIN sale_return_detail srd ON srd.return_id = sr.return_id
          JOIN medicine m ON m.medicine_id = srd.medicine_id
          WHERE sr.sale_id = $1
        )
        SELECT sold_total_sub_units, returned_total_sub_units
        FROM sale_totals, return_totals
      `,
      [saleId]
    );

    const soldTotalSubUnits = Number(checkRes.rows[0]?.sold_total_sub_units || 0);
    const returnedTotalSubUnits = Number(checkRes.rows[0]?.returned_total_sub_units || 0);

    if (soldTotalSubUnits > 0 && returnedTotalSubUnits >= soldTotalSubUnits) {
      await client.query(
        `UPDATE pharmacy_sale SET status = 'Returned' WHERE sale_id = $1`,
        [saleId]
      );
    }

    await client.query("COMMIT");

    return NextResponse.json(
      {
        success: true,
        message: "Medicines returned successfully",
        return_id,
      },
      { status: 200 }
    );
  } catch (err: any) {
    await client.query("ROLLBACK");
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Return API Error:", err);

    return NextResponse.json(
      { success: false, error: err.message || "Failed to return medicines" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
