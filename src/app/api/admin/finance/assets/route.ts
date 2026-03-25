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
      filters.push(`fap.purchase_date >= $${params.length}::date`);
    }
    if (to) {
      params.push(to);
      filters.push(`fap.purchase_date <= $${params.length}::date`);
    }

    const result = await query(
      `
      SELECT fap.*, s.name AS created_by_name
      FROM finance_asset_purchase fap
      LEFT JOIN staff s ON s.staff_id = fap.created_by
      WHERE ${filters.join(" AND ")}
      ORDER BY fap.purchase_date DESC, fap.asset_purchase_id DESC
      `,
      params
    );

    return NextResponse.json(result.rows);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("finance assets GET error", error);
    return NextResponse.json({ error: "Failed to load asset purchases" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireAdminOrSuperAdmin(req);
    const body = await req.json();

    if (!body?.purchase_date || !body?.asset_name || !body?.asset_category || body?.amount == null) {
      return NextResponse.json({ error: "purchase_date, asset_name, asset_category and amount are required" }, { status: 400 });
    }

    const inserted = await query(
      `
      INSERT INTO finance_asset_purchase (
        purchase_date,
        asset_name,
        asset_category,
        amount,
        vendor_name,
        reference_no,
        useful_life_months,
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
        body.purchase_date,
        String(body.asset_name).trim(),
        String(body.asset_category).trim(),
        Number(body.amount),
        body?.vendor_name ? String(body.vendor_name).trim() : null,
        body?.reference_no ? String(body.reference_no).trim() : null,
        body?.useful_life_months ? Number(body.useful_life_months) : null,
        body?.notes ?? null,
        actor.user_code,
      ]
    );

    await logAuditEvent({
      actorUserCode: actor.user_code,
      action: "Asset purchase logged",
      entityType: "finance_asset_purchase",
      entityId: inserted.rows[0]?.asset_purchase_id ?? null,
      details: {
        assetName: body.asset_name,
        amount: Number(body.amount),
      },
    });

    return NextResponse.json(inserted.rows[0], { status: 201 });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("finance assets POST error", error);
    return NextResponse.json({ error: "Failed to add asset purchase" }, { status: 500 });
  }
}
