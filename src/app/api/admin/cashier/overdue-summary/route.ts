import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrSuperAdmin(req);

    const [summary, topOverdue] = await Promise.all([
      query(
        `
          WITH due_base AS (
            SELECT
              b.bill_id,
              GREATEST(COALESCE(b.total_amount, 0) - COALESCE(SUM(cpt.amount), 0), 0) AS due_amount,
              GREATEST((CURRENT_DATE - b.created_at::date), 0)::int AS overdue_days
            FROM bill b
            LEFT JOIN cashier_payment_txn cpt ON cpt.bill_id = b.bill_id
            GROUP BY b.bill_id, b.total_amount, b.created_at
          )
          SELECT
            COUNT(*) FILTER (WHERE due_amount > 0) AS total_due_bills,
            COALESCE(SUM(due_amount) FILTER (WHERE due_amount > 0), 0) AS total_due_amount,
            COUNT(*) FILTER (WHERE due_amount > 0 AND overdue_days >= 7 AND overdue_days < 30) AS bucket_7,
            COUNT(*) FILTER (WHERE due_amount > 0 AND overdue_days >= 30 AND overdue_days < 60) AS bucket_30,
            COUNT(*) FILTER (WHERE due_amount > 0 AND overdue_days >= 60) AS bucket_60
          FROM due_base
        `
      ),
      query(
        `
          WITH due_base AS (
            SELECT
              b.bill_id,
              b.visit_id,
              p.patient_name,
              GREATEST(COALESCE(b.total_amount, 0) - COALESCE(SUM(cpt.amount), 0), 0) AS due_amount,
              GREATEST((CURRENT_DATE - b.created_at::date), 0)::int AS overdue_days
            FROM bill b
            JOIN patient p ON p.patient_id = b.patient_id
            LEFT JOIN cashier_payment_txn cpt ON cpt.bill_id = b.bill_id
            GROUP BY b.bill_id, b.visit_id, p.patient_name, b.total_amount, b.created_at
          )
          SELECT *
          FROM due_base
          WHERE due_amount > 0
          ORDER BY due_amount DESC, overdue_days DESC
          LIMIT 10
        `
      ),
    ]);

    return NextResponse.json({
      summary: {
        totalDueBills: Number(summary.rows[0]?.total_due_bills ?? 0),
        totalDueAmount: Number(summary.rows[0]?.total_due_amount ?? 0),
        bucket7: Number(summary.rows[0]?.bucket_7 ?? 0),
        bucket30: Number(summary.rows[0]?.bucket_30 ?? 0),
        bucket60: Number(summary.rows[0]?.bucket_60 ?? 0),
      },
      topOverdue: topOverdue.rows.map((row) => ({
        billId: Number(row.bill_id),
        visitId: Number(row.visit_id ?? 0),
        patientName: row.patient_name ?? "",
        dueAmount: Number(row.due_amount ?? 0),
        overdueDays: Number(row.overdue_days ?? 0),
      })),
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("admin cashier overdue summary error:", error);
    return NextResponse.json({ error: "Failed to load overdue summary" }, { status: 500 });
  }
}

