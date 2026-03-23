import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError } from "@/src/lib/server/auth";
import { requireCashierOrAdmin } from "@/src/lib/server/cashier";
import { logAuditEvent } from "@/src/lib/server/audit";

async function resolveStaffId(userCode: string) {
  const result = await query("select staff_id from staff where user_code = $1 limit 1", [userCode]);
  return result.rows[0]?.staff_id ? Number(result.rows[0].staff_id) : null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireCashierOrAdmin(req);
    const staffId = await resolveStaffId(user.user_code);
    if (!staffId) {
      return NextResponse.json({ error: "Unable to resolve staff" }, { status: 403 });
    }

    const activeShift = await query(
      `
        SELECT *
        FROM cashier_shift
        WHERE staff_id = $1
          AND status = 'open'
        ORDER BY opened_at DESC
        LIMIT 1
      `,
      [staffId]
    );

    return NextResponse.json({
      activeShift: activeShift.rows[0] ?? null,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("cashier shift GET error:", error);
    return NextResponse.json({ error: "Failed to load shift" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireCashierOrAdmin(req);
    const staffId = await resolveStaffId(user.user_code);
    if (!staffId) {
      return NextResponse.json({ error: "Unable to resolve staff" }, { status: 403 });
    }

    const body = await req.json();
    const openingCash = Number(body?.openingCash ?? 0);
    const notes = body?.notes ? String(body.notes) : null;

    const existingOpen = await query(
      `
        SELECT cashier_shift_id
        FROM cashier_shift
        WHERE staff_id = $1
          AND status = 'open'
        LIMIT 1
      `,
      [staffId]
    );
    if (existingOpen.rows.length > 0) {
      return NextResponse.json({ error: "An active shift already exists" }, { status: 409 });
    }

    const created = await query(
      `
        INSERT INTO cashier_shift (
          staff_id,
          opening_cash,
          notes,
          status
        ) VALUES ($1, $2, $3, 'open')
        RETURNING *
      `,
      [staffId, openingCash, notes]
    );

    await logAuditEvent({
      actorStaffId: staffId,
      action: "Cashier shift opened",
      entityType: "cashier_shift",
      entityId: created.rows[0]?.cashier_shift_id ?? null,
      details: {
        openingCash,
        notes,
      },
    });
    return NextResponse.json({ success: true, shift: created.rows[0] });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("cashier shift POST error:", error);
    return NextResponse.json({ error: "Failed to open shift" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireCashierOrAdmin(req);
    const staffId = await resolveStaffId(user.user_code);
    if (!staffId) {
      return NextResponse.json({ error: "Unable to resolve staff" }, { status: 403 });
    }

    const body = await req.json();
    const countedCash = Number(body?.countedCash ?? 0);
    const notes = body?.notes ? String(body.notes) : null;

    const activeShift = await query(
      `
        SELECT cashier_shift_id, opening_cash
        FROM cashier_shift
        WHERE staff_id = $1
          AND status = 'open'
        ORDER BY opened_at DESC
        LIMIT 1
      `,
      [staffId]
    );
    if (activeShift.rows.length === 0) {
      return NextResponse.json({ error: "No active shift to close" }, { status: 404 });
    }

    const shiftId = Number(activeShift.rows[0].cashier_shift_id);
    const expectedResult = await query(
      `
        SELECT
          COALESCE(SUM(amount), 0) AS cash_collected
        FROM cashier_payment_txn
        WHERE received_by = $1
          AND payment_type = 'CASH'
          AND txn_type = 'payment'
          AND created_at >= (
            SELECT opened_at FROM cashier_shift WHERE cashier_shift_id = $2
          )
      `,
      [staffId, shiftId]
    );
    const expectedCash =
      Number(activeShift.rows[0].opening_cash ?? 0) + Number(expectedResult.rows[0]?.cash_collected ?? 0);
    const variance = countedCash - expectedCash;

    const updated = await query(
      `
        UPDATE cashier_shift
        SET
          closed_at = CURRENT_TIMESTAMP,
          closing_cash_counted = $2,
          expected_cash = $3,
          variance = $4,
          status = 'closed',
          notes = COALESCE($5, notes),
          closed_by = $6
        WHERE cashier_shift_id = $1
        RETURNING *
      `,
      [shiftId, countedCash, expectedCash, variance, notes, staffId]
    );

    await logAuditEvent({
      actorStaffId: staffId,
      action: "Cashier shift closed",
      entityType: "cashier_shift",
      entityId: shiftId,
      details: {
        countedCash,
        expectedCash,
        variance,
      },
    });
    return NextResponse.json({ success: true, shift: updated.rows[0] });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("cashier shift PATCH error:", error);
    return NextResponse.json({ error: "Failed to close shift" }, { status: 500 });
  }
}
