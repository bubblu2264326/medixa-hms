import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";
import { assertPermitted } from "@/src/lib/server/permissions";

// Single-employee fetch backing the Employee Profile drill-in (/admin/staff/[id]).
// Doctors and staff live in separate tables, so the caller passes ?accountType.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireAdminOrSuperAdmin(req);
    await assertPermitted(actor, "staff_directory", "view");

    const { id } = await params;
    const staffId = Number(id);
    if (!Number.isFinite(staffId) || staffId <= 0) {
      return NextResponse.json({ error: "Invalid employee id" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const accountType = searchParams.get("accountType") === "doctor" ? "doctor" : "staff";

    if (accountType === "doctor") {
      const result = await query(
        `
          SELECT
            'doctor'::text AS account_type,
            doctor_id AS staff_id,
            user_code,
            doctor_name AS name,
            'Doctor'::text AS role,
            contact_number,
            email,
            specialization AS department,
            'Doctor'::text AS designation,
            'MAIN'::text AS facility_code,
            'HQ'::text AS branch_code,
            COALESCE(employment_status, 'active') AS employment_status
          FROM doctor
          WHERE doctor_id = $1
          LIMIT 1
        `,
        [staffId]
      );
      if (!result.rows[0]) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 });
      }
      return NextResponse.json(result.rows[0]);
    }

    const result = await query(
      `
        SELECT
          'staff'::text AS account_type,
          staff_id,
          user_code,
          name,
          role,
          photo_url,
          gender,
          dob,
          contact_number,
          email,
          emergency_contact_name,
          emergency_contact_number,
          address_line_1,
          address_line_2,
          city,
          state,
          postal_code,
          national_id,
          license_id,
          department,
          designation,
          employment_type,
          work_location,
          facility_code,
          branch_code,
          reporting_manager_staff_id,
          joined_at,
          exited_at,
          employment_status,
          staff_tags
        FROM staff
        WHERE staff_id = $1
        LIMIT 1
      `,
      [staffId]
    );
    if (!result.rows[0]) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("staff v2 [id] GET error", error);
    return NextResponse.json({ error: "Failed to load employee profile" }, { status: 500 });
  }
}
