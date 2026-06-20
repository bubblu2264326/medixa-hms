import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireRoles } from "@/src/lib/server/auth";

const REGISTER_ROLES = ["admin", "super_admin", "pharmacist"];

// GET /api/pharmacy/narcotics-register?from=YYYY-MM-DD&to=YYYY-MM-DD
// Controlled-drug movement register (DRAP compliance): dispenses out + returns in.
export async function GET(req: NextRequest) {
  try {
    await requireRoles(req, REGISTER_ROLES);
    const sp = new URL(req.url).searchParams;
    const from = sp.get("from");
    const to = sp.get("to");
    const res = await query(
      `SELECT r.movement_at, r.movement_type, r.medicine_id, r.generic_name, r.brand_name,
              r.controlled_schedule, r.batch_id, r.qty_units, r.qty_sub_units,
              r.sale_id, r.visit_id, r.staff_id, s.name AS staff_name
       FROM v_narcotics_register r
       LEFT JOIN staff s ON s.staff_id = r.staff_id
       WHERE ($1::date IS NULL OR r.movement_at >= $1::date)
         AND ($2::date IS NULL OR r.movement_at < ($2::date + 1))
       ORDER BY r.movement_at DESC`,
      [from, to]
    );
    return NextResponse.json(res.rows, { status: 200 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("narcotics register GET error", err);
    return NextResponse.json({ error: "Failed to load narcotics register" }, { status: 500 });
  }
}
