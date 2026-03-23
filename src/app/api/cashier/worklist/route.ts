import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError } from "@/src/lib/server/auth";
import { requireCashierOrAdmin } from "@/src/lib/server/cashier";

export async function GET(req: NextRequest) {
  try {
    await requireCashierOrAdmin(req);

    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const status = searchParams.get("status");
    const patient = searchParams.get("patient");
    const visitId = searchParams.get("visitId");
    const billId = searchParams.get("billId");
    const clinicNumber = searchParams.get("clinicNumber");
    const phone = searchParams.get("phone");
    const agingBucket = searchParams.get("agingBucket");
    const sortBy = searchParams.get("sortBy") || "recency";
    const sortDir = (searchParams.get("sortDir") || "desc").toLowerCase() === "asc" ? "asc" : "desc";
    const page = Math.max(Number(searchParams.get("page") || "1"), 1);
    const pageSize = Math.min(Math.max(Number(searchParams.get("pageSize") || "50"), 1), 200);
    const offset = (page - 1) * pageSize;

    const sortExpr =
      sortBy === "dueAmount"
        ? "due_amount"
        : sortBy === "dueScore"
          ? "due_score"
          : sortBy === "patientName"
            ? "patient_name"
            : "bill_id";

    const rows = await query(
      `
        WITH base AS (
          SELECT
            b.bill_id,
            b.visit_id,
            b.patient_id,
            p.patient_name,
            p.contact_number,
            v.clinic_number,
            b.total_amount,
            b.payment_status,
            b.created_at,
            COALESCE(SUM(cpt.amount), 0) AS paid_amount,
            GREATEST(COALESCE(b.total_amount, 0) - COALESCE(SUM(cpt.amount), 0), 0) AS due_amount,
            MAX(cpt.created_at) AS last_payment_at,
            GREATEST((CURRENT_DATE - b.created_at::date), 0)::int AS overdue_days,
            (
              GREATEST(COALESCE(b.total_amount, 0) - COALESCE(SUM(cpt.amount), 0), 0) * 0.7
              + GREATEST((CURRENT_DATE - b.created_at::date), 0)::int * 25
            )::numeric(12,2) AS due_score
          FROM bill b
          JOIN patient p ON p.patient_id = b.patient_id
          LEFT JOIN visit v ON v.visit_id = b.visit_id
          LEFT JOIN cashier_payment_txn cpt ON cpt.bill_id = b.bill_id
          WHERE ($1::date IS NULL OR b.created_at::date >= $1::date)
            AND ($2::date IS NULL OR b.created_at::date <= $2::date)
            AND ($3::text IS NULL OR b.payment_status = $3::text)
            AND ($4::text IS NULL OR p.patient_name ILIKE ('%' || $4::text || '%'))
            AND ($5::int IS NULL OR b.visit_id = $5::int)
            AND ($6::int IS NULL OR b.bill_id = $6::int)
            AND ($7::int IS NULL OR v.clinic_number = $7::int)
            AND ($8::text IS NULL OR p.contact_number ILIKE ('%' || $8::text || '%'))
          GROUP BY b.bill_id, b.visit_id, b.patient_id, p.patient_name, p.contact_number, v.clinic_number, b.total_amount, b.payment_status, b.created_at
        )
        SELECT *
        FROM base
        WHERE (
          $9::text IS NULL
          OR ($9 = '7+' AND overdue_days >= 7 AND overdue_days < 30)
          OR ($9 = '30+' AND overdue_days >= 30 AND overdue_days < 60)
          OR ($9 = '60+' AND overdue_days >= 60)
        )
        ORDER BY
          CASE WHEN $10 = 'dueAmount' AND $11 = 'asc' THEN due_amount END ASC,
          CASE WHEN $10 = 'dueAmount' AND $11 = 'desc' THEN due_amount END DESC,
          CASE WHEN $10 = 'dueScore' AND $11 = 'asc' THEN due_score END ASC,
          CASE WHEN $10 = 'dueScore' AND $11 = 'desc' THEN due_score END DESC,
          CASE WHEN $10 = 'patientName' AND $11 = 'asc' THEN patient_name END ASC,
          CASE WHEN $10 = 'patientName' AND $11 = 'desc' THEN patient_name END DESC,
          CASE WHEN $10 = 'recency' AND $11 = 'asc' THEN bill_id END ASC,
          CASE WHEN $10 = 'recency' AND $11 = 'desc' THEN bill_id END DESC
        LIMIT $12 OFFSET $13
      `,
      [
        dateFrom || null,
        dateTo || null,
        status || null,
        patient || null,
        visitId ? Number(visitId) : null,
        billId ? Number(billId) : null,
        clinicNumber ? Number(clinicNumber) : null,
        phone || null,
        agingBucket || null,
        sortBy,
        sortDir,
        pageSize,
        offset,
      ]
    );

    return NextResponse.json({
      page,
      pageSize,
      sortBy: sortExpr,
      sortDir,
      items: rows.rows.map((row) => ({
        billId: Number(row.bill_id),
        visitId: Number(row.visit_id ?? 0),
        patientId: Number(row.patient_id ?? 0),
        patientName: String(row.patient_name ?? ""),
        phone: row.contact_number ?? null,
        clinicNumber: row.clinic_number == null ? null : Number(row.clinic_number),
        totalAmount: Number(row.total_amount ?? 0),
        paidAmount: Number(row.paid_amount ?? 0),
        dueAmount: Number(row.due_amount ?? 0),
        dueScore: Number(row.due_score ?? 0),
        overdueDays: Number(row.overdue_days ?? 0),
        paymentStatus: String(row.payment_status ?? "Unpaid"),
        lastPaymentAt: row.last_payment_at ?? null,
      })),
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("cashier worklist route error:", error);
    return NextResponse.json({ error: "Failed to load cashier worklist" }, { status: 500 });
  }
}
