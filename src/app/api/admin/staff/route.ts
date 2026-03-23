import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";
import { logAuditEvent } from "@/src/lib/server/audit";

// GET: Fetch all staff with their roles and basic permissions summary
export async function GET(req: NextRequest) {
  try {
    await requireAdminOrSuperAdmin(req);
    const staff = await query(`
      SELECT 
        s.staff_id, 
        s.name, 
        s.user_code, 
        s.role, 
        s.contact_number, 
        s.email,
        (SELECT COUNT(*) FROM staff_permissions sp WHERE sp.staff_id = s.staff_id AND sp.can_write = TRUE) as write_modules_count
      FROM staff s
      ORDER BY s.staff_id ASC
    `);

    return NextResponse.json(staff.rows);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Staff GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
  }
}

// POST: Add new staff member
export async function POST(req: NextRequest) {
  try {
    const user = await requireAdminOrSuperAdmin(req);
    const body = await req.json();
    const { name, user_code, role, contact_number, email, password } = body;

    if (!name || !user_code || !role || !password) {
      return NextResponse.json(
        { error: "Name, User Code, Role, and Password are required" },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO staff (name, user_code, role, contact_number, email, password) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING staff_id, name, user_code, role`,
      [name, user_code, role, contact_number, email, password]
    );

    // Default permissions for new staff (Read-only for all modules)
    const modules = ['financials', 'inventory', 'patients', 'hr', 'pharmacy'];
    for (const mod of modules) {
        await query(
            `INSERT INTO staff_permissions (staff_id, module, can_read, can_write) 
             VALUES ($1, $2, TRUE, FALSE)`,
            [result.rows[0].staff_id, mod]
        );
    }

    await logAuditEvent({
      actorUserCode: user.user_code,
      action: "Staff profile created",
      entityType: "staff",
      entityId: result.rows[0].staff_id,
      details: {
        createdStaff: {
          staffId: Number(result.rows[0].staff_id),
          name: result.rows[0].name,
          userCode: result.rows[0].user_code,
          role: result.rows[0].role,
        },
      },
    });

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Staff POST Error:", error);
    return NextResponse.json({ error: "Failed to create staff member" }, { status: 500 });
  }
}
