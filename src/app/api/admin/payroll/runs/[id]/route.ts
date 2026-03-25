import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";
import { logAuditEvent } from "@/src/lib/server/audit";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminOrSuperAdmin(_req);
    const { id } = await context.params;
    const runId = Number(id);

    if (!runId) {
      return NextResponse.json({ error: "Invalid payroll run id" }, { status: 400 });
    }

    const [run, lines] = await Promise.all([
      query(`SELECT * FROM payroll_run WHERE payroll_run_id = $1 LIMIT 1`, [runId]),
      query(
        `
        SELECT
          pli.*,
          COALESCE(s.name, d.doctor_name) AS person_name,
          COALESCE(s.user_code, d.user_code) AS user_code
        FROM payroll_line_item pli
        LEFT JOIN staff s ON s.staff_id = pli.staff_id
        LEFT JOIN doctor d ON d.doctor_id = pli.doctor_id
        WHERE pli.payroll_run_id = $1
        ORDER BY pli.account_type, person_name
        `,
        [runId]
      ),
    ]);

    if (!run.rows[0]) {
      return NextResponse.json({ error: "Payroll run not found" }, { status: 404 });
    }

    return NextResponse.json({
      run: run.rows[0],
      lines: lines.rows,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("payroll run GET error", error);
    return NextResponse.json({ error: "Failed to load payroll run" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdminOrSuperAdmin(req);
    const { id } = await context.params;
    const runId = Number(id);
    const body = await req.json();

    if (!runId) {
      return NextResponse.json({ error: "Invalid payroll run id" }, { status: 400 });
    }

    const existing = await query(
      `SELECT payroll_run_id, status FROM payroll_run WHERE payroll_run_id = $1 LIMIT 1`,
      [runId]
    );

    if (!existing.rows[0]) {
      return NextResponse.json({ error: "Payroll run not found" }, { status: 404 });
    }

    if (existing.rows[0].status === "finalized" && body?.action !== "void") {
      return NextResponse.json({ error: "Finalized payroll run is immutable" }, { status: 409 });
    }

    if (body?.action === "finalize") {
      const finalized = await query(
        `
        UPDATE payroll_run
        SET status = 'finalized',
            finalized_at = CURRENT_TIMESTAMP,
            finalized_by = (SELECT staff_id FROM staff WHERE user_code = $2),
            notes = COALESCE($3, notes)
        WHERE payroll_run_id = $1
        RETURNING *
        `,
        [runId, actor.user_code, body?.notes ?? null]
      );

      await logAuditEvent({
        actorUserCode: actor.user_code,
        action: "Payroll run finalized",
        entityType: "payroll_run",
        entityId: runId,
      });

      return NextResponse.json(finalized.rows[0]);
    }

    if (body?.action === "void") {
      const voided = await query(
        `
        UPDATE payroll_run
        SET status = 'void',
            notes = COALESCE($2, notes)
        WHERE payroll_run_id = $1
        RETURNING *
        `,
        [runId, body?.notes ?? null]
      );

      await logAuditEvent({
        actorUserCode: actor.user_code,
        action: "Payroll run voided",
        entityType: "payroll_run",
        entityId: runId,
      });

      return NextResponse.json(voided.rows[0]);
    }

    const adjustment = body?.adjustment;
    const lineId = Number(adjustment?.payroll_line_id ?? 0);
    const amount = Number(adjustment?.amount ?? 0);

    if (!lineId) {
      return NextResponse.json({ error: "Provide action=finalize|void or adjustment.payroll_line_id" }, { status: 400 });
    }

    const updatedLine = await query(
      `
      UPDATE payroll_line_item
      SET adjustment_total = COALESCE(adjustment_total, 0) + $2,
          net_amount = GREATEST(0, COALESCE(net_amount, 0) + $2),
          updated_at = CURRENT_TIMESTAMP,
          calc_snapshot = jsonb_set(
            COALESCE(calc_snapshot, '{}'::jsonb),
            '{manual_adjustment}',
            to_jsonb(COALESCE((COALESCE(calc_snapshot, '{}'::jsonb)->>'manual_adjustment')::numeric, 0) + $2),
            true
          )
      WHERE payroll_line_id = $1
        AND payroll_run_id = $3
      RETURNING *
      `,
      [lineId, amount, runId]
    );

    if (!updatedLine.rows[0]) {
      return NextResponse.json({ error: "Payroll line not found for this run" }, { status: 404 });
    }

    await logAuditEvent({
      actorUserCode: actor.user_code,
      action: "Payroll line adjusted",
      entityType: "payroll_line_item",
      entityId: lineId,
      details: { amount },
    });

    return NextResponse.json(updatedLine.rows[0]);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("payroll run PATCH error", error);
    return NextResponse.json({ error: "Failed to update payroll run" }, { status: 500 });
  }
}
