import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";
import { logAuditEvent } from "@/src/lib/server/audit";

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrSuperAdmin(req);
    const result = await query(
      `
      SELECT
        shift_template_id,
        shift_code,
        shift_name,
        start_time,
        end_time,
        is_night_shift,
        is_split_shift,
        department,
        facility_code,
        branch_code,
        max_staff,
        min_staff
      FROM staff_shift_templates
      ORDER BY shift_name
      `
    );
    return NextResponse.json(result.rows);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("staff v2 roster templates GET error", error);
    return NextResponse.json({ error: "Failed to load shift templates" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireAdminOrSuperAdmin(req);
    const body = await req.json();
    const { shift_code, shift_name, start_time, end_time } = body;
    if (!shift_code || !shift_name || !start_time || !end_time) {
      return NextResponse.json(
        { error: "shift_code, shift_name, start_time and end_time are required" },
        { status: 400 }
      );
    }

    const result = await query(
      `
      INSERT INTO staff_shift_templates (
        shift_code,
        shift_name,
        start_time,
        end_time,
        is_night_shift,
        is_split_shift,
        department,
        facility_code,
        branch_code,
        max_staff,
        min_staff,
        created_by
      ) VALUES (
        $1, $2, $3, $4, COALESCE($5, false), COALESCE($6, false),
        $7, $8, $9, $10, $11, (SELECT staff_id FROM staff WHERE user_code = $12)
      )
      RETURNING *
      `,
      [
        String(shift_code).toUpperCase(),
        shift_name,
        start_time,
        end_time,
        body?.is_night_shift ?? false,
        body?.is_split_shift ?? false,
        body?.department ?? null,
        body?.facility_code ?? null,
        body?.branch_code ?? null,
        body?.max_staff ?? null,
        body?.min_staff ?? null,
        actor.user_code,
      ]
    );

    await logAuditEvent({
      actorUserCode: actor.user_code,
      action: "Shift template created",
      entityType: "staff_shift_template",
      entityId: result.rows[0]?.shift_template_id ?? null,
      details: {
        shiftCode: result.rows[0]?.shift_code ?? null,
      },
    });

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("staff v2 roster templates POST error", error);
    return NextResponse.json({ error: "Failed to create shift template" }, { status: 500 });
  }
}

