import { NextRequest, NextResponse } from "next/server";
import pool from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";
import { logAuditEvent } from "@/src/lib/server/audit";
import { computePayrollLines, monthBounds, monthStartFromInput } from "@/src/lib/server/workforceFinance";

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrSuperAdmin(req);
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");

    const params: any[] = [];
    const filters: string[] = ["1=1"];
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const periodMonth = `${month}-01`;
      params.push(periodMonth);
      filters.push(`pr.period_month = $${params.length}::date`);
    }

    const runs = await pool.query(
      `
      SELECT
        pr.*,
        COALESCE(COUNT(pli.payroll_line_id), 0)::int AS line_count,
        COALESCE(SUM(pli.net_amount), 0)::numeric AS total_net_amount
      FROM payroll_run pr
      LEFT JOIN payroll_line_item pli ON pli.payroll_run_id = pr.payroll_run_id
      WHERE ${filters.join(" AND ")}
      GROUP BY pr.payroll_run_id
      ORDER BY pr.period_month DESC
      `,
      params
    );

    return NextResponse.json(runs.rows);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("payroll runs GET error", error);
    return NextResponse.json({ error: "Failed to load payroll runs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const actor = await requireAdminOrSuperAdmin(req);
    const body = await req.json().catch(() => ({}));
    const monthStartDate = monthStartFromInput(body?.month);
    const { monthStart } = monthBounds(monthStartDate);

    await client.query("BEGIN");

    const existing = await client.query(
      `
      SELECT payroll_run_id, status
      FROM payroll_run
      WHERE period_month = $1::date
      LIMIT 1
      `,
      [monthStart]
    );

    let payrollRunId: number;
    if (existing.rows[0]?.status === "finalized") {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Payroll run is finalized and cannot be regenerated" }, { status: 409 });
    }

    if (existing.rows[0]) {
      payrollRunId = Number(existing.rows[0].payroll_run_id);
      await client.query(
        `
        UPDATE payroll_run
        SET status = 'draft',
            generated_at = CURRENT_TIMESTAMP,
            generated_by = (SELECT staff_id FROM staff WHERE user_code = $2),
            finalized_by = NULL,
            finalized_at = NULL,
            notes = COALESCE($3, notes)
        WHERE payroll_run_id = $1
        `,
        [payrollRunId, actor.user_code, body?.notes ?? null]
      );

      await client.query(`DELETE FROM payroll_line_item WHERE payroll_run_id = $1`, [payrollRunId]);
    } else {
      const insertedRun = await client.query(
        `
        INSERT INTO payroll_run (period_month, status, generated_by, notes)
        VALUES ($1::date, 'draft', (SELECT staff_id FROM staff WHERE user_code = $2), $3)
        RETURNING payroll_run_id
        `,
        [monthStart, actor.user_code, body?.notes ?? null]
      );
      payrollRunId = Number(insertedRun.rows[0].payroll_run_id);
    }

    const computed = await computePayrollLines(monthStart.slice(0, 7));
    for (const line of computed.lines) {
      await client.query(
        `
        INSERT INTO payroll_line_item (
          payroll_run_id,
          account_type,
          person_id,
          staff_id,
          doctor_id,
          salary_model,
          base_amount,
          patient_count,
          per_patient_fee,
          allowance_total,
          deduction_total,
          adjustment_total,
          gross_amount,
          net_amount,
          calc_snapshot
        ) VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14,
          $15::jsonb
        )
        ON CONFLICT (payroll_run_id, account_type, person_id)
        DO UPDATE SET
          salary_model = EXCLUDED.salary_model,
          base_amount = EXCLUDED.base_amount,
          patient_count = EXCLUDED.patient_count,
          per_patient_fee = EXCLUDED.per_patient_fee,
          allowance_total = EXCLUDED.allowance_total,
          deduction_total = EXCLUDED.deduction_total,
          adjustment_total = EXCLUDED.adjustment_total,
          gross_amount = EXCLUDED.gross_amount,
          net_amount = EXCLUDED.net_amount,
          calc_snapshot = EXCLUDED.calc_snapshot,
          updated_at = CURRENT_TIMESTAMP
        `,
        [
          payrollRunId,
          line.accountType,
          line.personId,
          line.staffId,
          line.doctorId,
          line.salaryModel,
          line.baseAmount,
          line.patientCount,
          line.perPatientFee,
          line.allowanceTotal,
          line.deductionTotal,
          line.adjustmentTotal,
          line.grossAmount,
          line.netAmount,
          JSON.stringify(line.calcSnapshot ?? {}),
        ]
      );
    }

    const summary = await client.query(
      `
      SELECT
        COUNT(*)::int AS line_count,
        COALESCE(SUM(net_amount), 0)::numeric AS total_net_amount
      FROM payroll_line_item
      WHERE payroll_run_id = $1
      `,
      [payrollRunId]
    );

    await client.query("COMMIT");

    await logAuditEvent({
      actorUserCode: actor.user_code,
      action: "Payroll run generated",
      entityType: "payroll_run",
      entityId: payrollRunId,
      details: {
        month: monthStart.slice(0, 7),
        lineCount: Number(summary.rows[0]?.line_count ?? 0),
        totalNetAmount: Number(summary.rows[0]?.total_net_amount ?? 0),
      },
    });

    return NextResponse.json({
      payroll_run_id: payrollRunId,
      period_month: monthStart,
      line_count: Number(summary.rows[0]?.line_count ?? 0),
      total_net_amount: Number(summary.rows[0]?.total_net_amount ?? 0),
      status: "draft",
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("payroll runs POST error", error);
    return NextResponse.json({ error: "Failed to generate payroll run" }, { status: 500 });
  } finally {
    client.release();
  }
}
