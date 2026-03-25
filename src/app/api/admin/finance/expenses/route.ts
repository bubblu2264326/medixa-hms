import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";
import { logAuditEvent } from "@/src/lib/server/audit";

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrSuperAdmin(req);
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const params: any[] = [];
    const filters: string[] = ["1=1"];

    if (from) {
      params.push(from);
      filters.push(`fee.expense_date >= $${params.length}::date`);
    }
    if (to) {
      params.push(to);
      filters.push(`fee.expense_date <= $${params.length}::date`);
    }

    const result = await query(
      `
      SELECT fee.*, s.name AS created_by_name
      FROM finance_expense_entry fee
      LEFT JOIN staff s ON s.staff_id = fee.created_by
      WHERE ${filters.join(" AND ")}
      ORDER BY fee.expense_date DESC, fee.expense_id DESC
      `,
      params
    );

    return NextResponse.json(result.rows);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("finance expenses GET error", error);
    return NextResponse.json({ error: "Failed to load finance expenses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireAdminOrSuperAdmin(req);
    const body = await req.json();

    if (!body?.expense_date || !body?.category || body?.amount == null) {
      return NextResponse.json({ error: "expense_date, category and amount are required" }, { status: 400 });
    }

    const inserted = await query(
      `
      INSERT INTO finance_expense_entry (
        expense_date,
        category,
        subcategory,
        amount,
        vendor_name,
        reference_no,
        payment_mode,
        notes,
        created_by
      )
      VALUES (
        $1::date,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        (SELECT staff_id FROM staff WHERE user_code = $9)
      )
      RETURNING *
      `,
      [
        body.expense_date,
        String(body.category).trim(),
        body?.subcategory ? String(body.subcategory).trim() : null,
        Number(body.amount),
        body?.vendor_name ? String(body.vendor_name).trim() : null,
        body?.reference_no ? String(body.reference_no).trim() : null,
        body?.payment_mode ? String(body.payment_mode).trim() : null,
        body?.notes ?? null,
        actor.user_code,
      ]
    );

    await logAuditEvent({
      actorUserCode: actor.user_code,
      action: "Finance expense added",
      entityType: "finance_expense_entry",
      entityId: inserted.rows[0]?.expense_id ?? null,
      details: {
        category: body.category,
        amount: Number(body.amount),
      },
    });

    return NextResponse.json(inserted.rows[0], { status: 201 });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("finance expenses POST error", error);
    return NextResponse.json({ error: "Failed to add finance expense" }, { status: 500 });
  }
}
