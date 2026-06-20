import { query } from "@/database/db";
import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/medicine/returnMedicine/currentMeds/:patientId
 *
 * Fetches returnable medicines from the patient's latest visit
 * using the unified pharmacy_sale_detail table.
 *
 * Business Logic:
 * ✅ Only medicines from latest visit
 * ✅ Only line items with outstanding quantity remaining to return
 * ✅ Includes unified sale detail metadata needed by the return POST route
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { patientId: string } }
) {
  const id = (await params).patientId;

  try {
    await getAuthenticatedUser(req);
    // 1️⃣ Get latest visit_id for the patient
    const visitRes = await query(
      `SELECT visit_id
       FROM visit
       WHERE patient_id = $1
       ORDER BY visit_timestamp DESC
       LIMIT 1;`,
      [id]
    );

    if (visitRes.rows.length === 0) {
      return NextResponse.json(
        { message: "No visits found for this patient" },
        { status: 404 }
      );
    }

    const latestVisitId = visitRes.rows[0].visit_id;
    const medsRes = await query(
      `
        WITH returned_totals AS (
          SELECT
            sr.sale_id,
            srd.medicine_id,
            srd.batch_id,
            COALESCE(SUM(srd.returned_quantity), 0) AS returned_quantity,
            COALESCE(SUM(srd.returned_sub_quantity), 0) AS returned_sub_quantity
          FROM sale_return sr
          JOIN sale_return_detail srd ON srd.return_id = sr.return_id
          GROUP BY sr.sale_id, srd.medicine_id, srd.batch_id
        )
        SELECT
          psd.pharmacy_sale_detail_id AS sale_detail_id,
          ps.sale_id,
          pm.prescription_medicine_id,
          ps.visit_id,
          m.medicine_id,
          m.brand_name,
          m.generic_name,
          m.dosage_value,
          m.dosage_unit,
          m.form,
          pm.frequency,
          pm.duration,
          pm.prescribed_quantity,
          pm.dispensed_quantity,
          pm.instructions,
          d.doctor_name AS prescribed_by,
          COALESCE(st.name, 'N/A') AS dispensed_by,
          p.created_at::date AS order_date,
          psd.batch_id,
          mb.batch_number,
          psd.quantity,
          psd.sub_quantity,
          psd.unit_sale_price,
          COALESCE(psd.sub_unit_sale_price, 0) AS sub_unit_sale_price,
          psd.line_total,
          psd.reason_code,
          psd.reason_note,
          COALESCE(rt.returned_quantity, 0) AS returned_quantity,
          COALESCE(rt.returned_sub_quantity, 0) AS returned_sub_quantity
        FROM pharmacy_sale ps
        JOIN pharmacy_sale_detail psd
          ON psd.sale_id = ps.sale_id
        JOIN medicine m
          ON m.medicine_id = psd.medicine_id
        LEFT JOIN medicine_batch mb
          ON mb.batch_id = psd.batch_id
        LEFT JOIN prescription_medicines pm
          ON pm.prescription_medicine_id = psd.prescription_medicine_id
        LEFT JOIN prescription p
          ON p.prescription_id = pm.prescription_id
        LEFT JOIN doctor d
          ON d.doctor_id = p.doctor_id
        LEFT JOIN staff st
          ON st.staff_id = COALESCE(pm.dispensed_by, psd.handled_by)
        LEFT JOIN returned_totals rt
          ON rt.sale_id = ps.sale_id
         AND rt.medicine_id = psd.medicine_id
         AND (
           (rt.batch_id IS NULL AND psd.batch_id IS NULL)
           OR rt.batch_id = psd.batch_id
         )
        WHERE ps.visit_id = $1
          AND ps.status IN ('Completed', 'Returned')
        ORDER BY ps.sale_id ASC, psd.pharmacy_sale_detail_id ASC
      `,
      [latestVisitId]
    );

    const returnableRows = medsRes.rows
      .map((row) => {
        const remainingQuantity = Math.max(Number(row.quantity || 0) - Number(row.returned_quantity || 0), 0);
        const remainingSubQuantity = Math.max(Number(row.sub_quantity || 0) - Number(row.returned_sub_quantity || 0), 0);

        if (remainingQuantity <= 0 && remainingSubQuantity <= 0) {
          return null;
        }

        const lineTotal =
          Number(row.unit_sale_price || 0) * remainingQuantity +
          Number(row.sub_unit_sale_price || 0) * remainingSubQuantity;

        return {
          sale_id: Number(row.sale_id),
          sale_detail_id: Number(row.sale_detail_id),
          prescription_medicine_id: row.prescription_medicine_id ? Number(row.prescription_medicine_id) : null,
          medicine_id: Number(row.medicine_id),
          brand_name: row.brand_name,
          generic_name: row.generic_name,
          dosage_value: Number(row.dosage_value || 0),
          dosage_unit: row.dosage_unit,
          form: row.form,
          frequency: row.frequency,
          duration: row.duration,
          prescribed_quantity: String(row.prescribed_quantity ?? ""),
          dispensed_quantity: remainingQuantity,
          instructions: row.instructions,
          prescribed_by: row.prescribed_by ?? "N/A",
          dispensed_by: row.dispensed_by,
          order_date: row.order_date,
          batch_id: row.batch_id ? Number(row.batch_id) : null,
          batch_number: row.batch_number,
          quantity: remainingQuantity,
          sub_quantity: remainingSubQuantity,
          unit_sale_price: Number(row.unit_sale_price || 0),
          sub_unit_sale_price: Number(row.sub_unit_sale_price || 0),
          line_total: Number(lineTotal.toFixed(2)),
          reason_code: row.reason_code,
          reason_note: row.reason_note,
        };
      })
      .filter(Boolean);

    return NextResponse.json(returnableRows, { status: 200 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error fetching returnable medicines:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
