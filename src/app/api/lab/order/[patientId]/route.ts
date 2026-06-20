import { query } from "@/database/db";
import { NextRequest, NextResponse } from "next/server";
import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { patientId: string } }
) {
  const id = params.patientId;

  try {
    await getAuthenticatedUser(req);
    const res = await query(
      `
      SELECT
        v.visit_id,
        lo.order_id,
        lt.test_id,
        lt.test_name,
        lt.category,
        lt.price,
        lt.description,
        lo.status,
        d.doctor_name AS ordered_by,
        s.name AS performed_by,
        TO_CHAR(lo.created_at, 'YYYY-MM-DD') AS order_date
      FROM visit v
      JOIN lab_order lo ON v.visit_id = lo.visit_id
      JOIN lab_test lt ON lt.test_id = lo.test_id
      JOIN doctor d ON d.doctor_id = lo.ordered_by
      LEFT JOIN staff s ON s.staff_id = lo.performed_by
      WHERE v.patient_id = $1
      ORDER BY v.visit_id DESC, lo.order_id DESC;
      `,
      [id]
    );
    console.log(res.rows);
    
    return NextResponse.json(res.rows, { status: 200 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
