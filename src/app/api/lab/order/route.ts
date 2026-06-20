import { query } from "@/database/db";
import { NextRequest, NextResponse } from "next/server";
import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";

// We remove { params } and extract date range from searchParams
export async function GET(req: NextRequest) {
  // 1. Extract startDate and endDate from URL query parameters
  const searchParams = req.nextUrl.searchParams;
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  // Basic validation (PM Note: You may want to add better default dates)
  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "Missing required parameters: startDate and endDate." },
      { status: 400 }
    );
  }

  try {
    await getAuthenticatedUser(req);
    const res = await query(
      `
      SELECT
        p.patient_id,
        p.patient_name,
        p.age, 
        p.gender,
        v.visit_id,
        lo.order_id,
        lo.urgency,
        lo.status, -- PM/SME addition: Crucial for collection
        lt.test_id,
        lt.test_name,
        lt.category,
        d.doctor_name AS ordered_by,
        s.name AS performed_by,
        TO_CHAR(lo.created_at, 'YYYY-MM-DD') AS order_date,
        COUNT(lo.order_id) OVER (PARTITION BY v.visit_id) AS total_orders_in_visit
      FROM visit v
      JOIN patient p ON v.patient_id = p.patient_id -- Join to get patient details
      JOIN lab_order lo ON v.visit_id = lo.visit_id
      JOIN lab_test lt ON lt.test_id = lo.test_id
      JOIN doctor d ON d.doctor_id = lo.ordered_by
      LEFT JOIN staff s ON s.staff_id = lo.performed_by
      
      -- 2. Filter by the lab order creation date
      WHERE lo.created_at::date BETWEEN $1::date AND $2::date
      
      -- 3. Ordering for the dashboard: by date, then patient, then order priority
      ORDER BY 
        lo.created_at ASC,  
        lo.urgency DESC, -- Assuming DESC gives highest priority first
        lo.order_id ASC;
      `,
      [startDate, endDate]
    );

    console.log(`Retrieved ${res.rows.length} lab orders for date range ${startDate} to ${endDate}`);
    
    // The front-end will need to group this flat list by patient_id or visit_id for the UI.
    return NextResponse.json(res.rows, { status: 200 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("API Error in Lab Orders GET:", err);
    return NextResponse.json({ error: "Failed to retrieve lab orders." }, { status: 500 });
  }
}