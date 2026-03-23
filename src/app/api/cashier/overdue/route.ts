import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError } from "@/src/lib/server/auth";
import { requireCashierOrAdmin } from "@/src/lib/server/cashier";

export async function GET(req: NextRequest) {
  try {
    await requireCashierOrAdmin(req);
    const { searchParams } = new URL(req.url);
    const bucket = searchParams.get("bucket");
    const patient = searchParams.get("patient");
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || "200"), 1), 500);

    const result = await query(
      `
        WITH due_base AS (
          SELECT
            b.bill_id,
            b.visit_id,
            b.patient_id,
            p.patient_name,
            p.contact_number,
            v.clinic_number,
            b.total_amount,
            b.created_at,
            COALESCE(SUM(cpt.amount), 0) AS paid_amount,
            GREATEST(COALESCE(b.total_amount, 0) - COALESCE(SUM(cpt.amount), 0), 0) AS due_amount,
            GREATEST((CURRENT_DATE - b.created_at::date), 0)::int AS overdue_days
          FROM bill b
          JOIN patient p ON p.patient_id = b.patient_id
          LEFT JOIN visit v ON v.visit_id = b.visit_id
          LEFT JOIN cashier_payment_txn cpt ON cpt.bill_id = b.bill_id
          GROUP BY b.bill_id, b.visit_id, b.patient_id, p.patient_name, p.contact_number, v.clinic_number, b.total_amount, b.created_at
        )
        SELECT
          *,
          (
            (due_amount * 0.7)
            + (overdue_days * 25)
          )::numeric(12,2) AS risk_score,
          CASE
            WHEN overdue_days >= 60 THEN '60+'
            WHEN overdue_days >= 30 THEN '30+'
            WHEN overdue_days >= 7 THEN '7+'
            ELSE '<7'
          END AS aging_bucket
        FROM due_base
        WHERE due_amount > 0
          AND ($1::text IS NULL OR patient_name ILIKE ('%' || $1::text || '%'))
          AND (
            $2::text IS NULL
            OR ($2 = '7+' AND overdue_days >= 7 AND overdue_days < 30)
            OR ($2 = '30+' AND overdue_days >= 30 AND overdue_days < 60)
            OR ($2 = '60+' AND overdue_days >= 60)
          )
        ORDER BY risk_score DESC, due_amount DESC, overdue_days DESC
        LIMIT $3
      `,
      [patient || null, bucket || null, limit]
    );

    return NextResponse.json({
      items: result.rows.map((row) => ({
        billId: Number(row.bill_id),
        visitId: Number(row.visit_id ?? 0),
        patientId: Number(row.patient_id ?? 0),
        patientName: row.patient_name ?? "",
        phone: row.contact_number ?? null,
        clinicNumber: row.clinic_number == null ? null : Number(row.clinic_number),
        totalAmount: Number(row.total_amount ?? 0),
        paidAmount: Number(row.paid_amount ?? 0),
        dueAmount: Number(row.due_amount ?? 0),
        overdueDays: Number(row.overdue_days ?? 0),
        riskScore: Number(row.risk_score ?? 0),
        agingBucket: row.aging_bucket ?? "<7",
        alerts: {
          due7Plus: Number(row.overdue_days ?? 0) >= 7,
          due30Plus: Number(row.overdue_days ?? 0) >= 30,
          due60Plus: Number(row.overdue_days ?? 0) >= 60,
        },
      })),
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("cashier overdue route error:", error);
    return NextResponse.json({ error: "Failed to load overdue queue" }, { status: 500 });
  }
}

