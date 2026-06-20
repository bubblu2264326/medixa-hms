// Stage C — DB invariant checker.
//
// Queries the live (local) HMS database and asserts the cross-module integrity
// invariants. Run standalone to characterize current data, or after each batch
// of the curl scenario suite to prove the data stayed consistent.
//
// Usage: node --env-file=.env.local scripts/scenario-tests/check-invariants.mjs
// Exit code 0 = all invariants hold; 1 = one or more violated (CI-friendly).

import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required (run with --env-file=.env.local).");
  process.exit(2);
}

const isLocal = /@(localhost|127\.0\.0\.1)\b/.test(url);
const pool = new pg.Pool({
  connectionString: url,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

// Each check returns a `violations` count; 0 = invariant holds. `sample`
// (optional) returns up to a few offending rows to make failures actionable.
const checks = [
  {
    name: "stock-non-negative",
    desc: "no medicine_batch has negative stock_quantity / stock_sub_quantity",
    sql: `SELECT count(*)::int AS violations
          FROM medicine_batch
          WHERE COALESCE(stock_quantity,0) < 0 OR COALESCE(stock_sub_quantity,0) < 0`,
    sample: `SELECT batch_id, stock_quantity, stock_sub_quantity FROM medicine_batch
             WHERE COALESCE(stock_quantity,0) < 0 OR COALESCE(stock_sub_quantity,0) < 0 LIMIT 5`,
  },
  {
    name: "legal-visit-status",
    desc: "every visit.status is an allowed lifecycle value",
    sql: `SELECT count(*)::int AS violations FROM visit
          WHERE status IS NOT NULL AND status NOT IN
          ('waiting','seen_by_doctor','dispensing','medicines_dispensed','lab_tests_done','payment_done','completed','admitted','discharged')`,
    sample: `SELECT visit_id, status FROM visit WHERE status IS NOT NULL AND status NOT IN
             ('waiting','seen_by_doctor','dispensing','medicines_dispensed','lab_tests_done','payment_done','completed','admitted','discharged') LIMIT 5`,
  },
  {
    name: "legal-lab-status",
    desc: "every lab_order.status is an allowed value",
    sql: `SELECT count(*)::int AS violations FROM lab_order
          WHERE status IS NOT NULL AND status NOT IN ('Pending','Performed','Completed')`,
    sample: `SELECT order_id, status FROM lab_order WHERE status IS NOT NULL AND status NOT IN ('Pending','Performed','Completed') LIMIT 5`,
  },
  {
    name: "bill-payment-reconciles",
    desc: "bill.payment_status matches the ledger (total vs SUM of cashier_payment_txn)",
    sql: `
      WITH b AS (
        SELECT bill.bill_id, COALESCE(bill.total_amount,0) AS total, bill.payment_status,
               COALESCE((SELECT SUM(c.amount) FROM cashier_payment_txn c WHERE c.bill_id = bill.bill_id),0) AS paid
        FROM bill
      )
      SELECT count(*)::int AS violations FROM b
      WHERE (total > 0 AND paid >= total AND payment_status <> 'Paid')
         OR (total > 0 AND paid <= 0   AND payment_status <> 'Unpaid')
         OR (total > 0 AND paid > 0 AND paid < total AND payment_status <> 'Partial')`,
    sample: `
      WITH b AS (
        SELECT bill.bill_id, COALESCE(bill.total_amount,0) AS total, bill.payment_status,
               COALESCE((SELECT SUM(c.amount) FROM cashier_payment_txn c WHERE c.bill_id = bill.bill_id),0) AS paid
        FROM bill
      )
      SELECT bill_id, total, paid, payment_status FROM b
      WHERE (total > 0 AND paid >= total AND payment_status <> 'Paid')
         OR (total > 0 AND paid <= 0   AND payment_status <> 'Unpaid')
         OR (total > 0 AND paid > 0 AND paid < total AND payment_status <> 'Partial') LIMIT 5`,
  },
  {
    name: "no-orphan-bills",
    desc: "every bill references an existing patient and visit",
    sql: `SELECT count(*)::int AS violations FROM bill b
          WHERE NOT EXISTS (SELECT 1 FROM patient p WHERE p.patient_id=b.patient_id)
             OR NOT EXISTS (SELECT 1 FROM visit v WHERE v.visit_id=b.visit_id)`,
  },
  {
    name: "no-orphan-lab-results",
    desc: "every lab result references an existing lab_order",
    sql: `SELECT count(*)::int AS violations FROM lab_test_results r
          WHERE NOT EXISTS (SELECT 1 FROM lab_order o WHERE o.order_id=r.order_id)`,
  },
  {
    name: "no-orphan-pharmacy-sale-detail",
    desc: "every pharmacy_sale_detail references an existing pharmacy_sale",
    sql: `SELECT count(*)::int AS violations FROM pharmacy_sale_detail d
          WHERE NOT EXISTS (SELECT 1 FROM pharmacy_sale s WHERE s.sale_id=d.sale_id)`,
  },
  {
    name: "audit-log-present",
    desc: "audit_logs has entries (an audit trail exists)",
    sql: `SELECT CASE WHEN count(*) > 0 THEN 0 ELSE 1 END::int AS violations FROM audit_logs`,
  },
  {
    name: "sale-return-refund-reconciles",
    desc: "every sale_return.refund_amount matches the sum of its detail line values (M3)",
    sql: `
      WITH d AS (
        SELECT sr.return_id, COALESCE(sr.refund_amount,0) AS refund_amount,
               COALESCE(SUM(
                   COALESCE(srd.returned_quantity,0)     * COALESCE(srd.returned_unit_price,0)
                 + COALESCE(srd.returned_sub_quantity,0) * COALESCE(srd.returned_sub_unit_price,0)
               ),0) AS detail_total
        FROM sale_return sr
        LEFT JOIN sale_return_detail srd ON srd.return_id = sr.return_id
        GROUP BY sr.return_id, sr.refund_amount
      )
      SELECT count(*)::int AS violations FROM d WHERE abs(refund_amount - detail_total) > 0.01`,
    sample: `
      WITH d AS (
        SELECT sr.return_id, COALESCE(sr.refund_amount,0) AS refund_amount,
               COALESCE(SUM(
                   COALESCE(srd.returned_quantity,0)     * COALESCE(srd.returned_unit_price,0)
                 + COALESCE(srd.returned_sub_quantity,0) * COALESCE(srd.returned_sub_unit_price,0)
               ),0) AS detail_total
        FROM sale_return sr
        LEFT JOIN sale_return_detail srd ON srd.return_id = sr.return_id
        GROUP BY sr.return_id, sr.refund_amount
      )
      SELECT return_id, refund_amount, detail_total FROM d WHERE abs(refund_amount - detail_total) > 0.01 LIMIT 5`,
  },
];

let failed = 0;
console.log("HMS DB invariant check\n======================");
for (const c of checks) {
  try {
    const { rows } = await pool.query(c.sql);
    const v = Number(rows[0]?.violations ?? 0);
    if (v === 0) {
      console.log(`PASS  ${c.name}  —  ${c.desc}`);
    } else {
      failed++;
      console.error(`FAIL  ${c.name}  —  ${v} violation(s)  —  ${c.desc}`);
      if (c.sample) {
        try {
          const s = await pool.query(c.sample);
          for (const row of s.rows) console.error(`        ${JSON.stringify(row)}`);
        } catch {}
      }
    }
  } catch (e) {
    failed++;
    console.error(`ERROR ${c.name}  —  ${e.message}`);
  }
}
await pool.end();
console.log("======================");
console.log(failed === 0 ? "✓ ALL INVARIANTS HOLD" : `✗ ${failed} INVARIANT CHECK(S) FAILED`);
process.exit(failed === 0 ? 0 : 1);
