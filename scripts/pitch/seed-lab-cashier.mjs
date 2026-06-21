// Phase 2b — populate Lab + Cashier via the REAL APIs so the features are
// genuinely exercised (and demonstrable):
//   doctor orders tests  -> /api/doctor/lab-orders (auto-bills via lab->bill)
//   lab collects sample  -> /api/lab/sample
//   lab enters results   -> /api/lab/results (incl. one critical value)
//   cashier settles due  -> /api/cashier/settle (full / partial / leave-open)
// Guarded: skips ordering if lab_order already has data (idempotent-ish).
//
// Run:  node --env-file=.env.local scripts/pitch/seed-lab-cashier.mjs

import { SignJWT } from "jose";
import { randomUUID } from "node:crypto";
import pkg from "pg";
const { Pool } = pkg;

const BASE = process.env.UX_BASE || "http://localhost:3100";
if (!process.env.secret_key || !process.env.DATABASE_URL) throw new Error("run with --env-file=.env.local");
const secret = new TextEncoder().encode(process.env.secret_key);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });

async function tokenFor(userCode) {
  if (userCode.includes("DOC")) {
    const r = await pool.query("select user_code, doctor_name name, coalesce(session_version,1) sv from doctor where user_code=$1", [userCode]);
    const u = r.rows[0];
    return new SignJWT({ user_code: u.user_code, role: "Doctor", name: u.name, sv: Number(u.sv), account_type: "doctor" }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("8h").sign(secret);
  }
  const r = await pool.query("select user_code, name, role, coalesce(session_version,1) sv from staff where user_code=$1", [userCode]);
  const u = r.rows[0];
  return new SignJWT({ user_code: u.user_code, role: u.role, name: u.name, sv: Number(u.sv), account_type: "staff" }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("8h").sign(secret);
}

const post = (path, jwt, body, extraHeaders = {}) =>
  fetch(`${BASE}${path}`, { method: "POST", headers: { "Content-Type": "application/json", Cookie: `token=${jwt}`, ...extraHeaders }, body: JSON.stringify(body) })
    .then(async (r) => ({ ok: r.ok, status: r.status, json: await r.json().catch(() => ({})) }));

async function main() {
  const existing = (await pool.query("select count(*)::int c from lab_order")).rows[0].c;
  if (existing > 8) { console.log(`lab_order already has ${existing} rows — skipping (idempotent guard).`); await pool.end(); return; }

  const docJwt = await tokenFor("DOC001");
  const labJwt = await tokenFor("STF003");
  const cashJwt = await tokenFor("STF004");

  // Doctor-owned, non-hard-locked visits to attach tests to
  const visits = (await pool.query(`
    select visit_id, patient_id, status from visit
    where doctor_id = 1 and is_deleted = false and status not in ('completed','discharged')
    order by visit_id desc limit 10
  `)).rows;
  console.log(`ordering labs on ${visits.length} visits`);

  // params for tests with parameters (1 CBC[2], 2 Glucose[1], 3 Pregnancy[1])
  const params = (await pool.query("select test_id, parameter_id, parameter_name, reference_range_min, reference_range_max, is_critical from lab_test_parameters order by test_id, parameter_id")).rows;
  const paramsByTest = {};
  for (const p of params) (paramsByTest[p.test_id] ||= []).push(p);

  const testPlan = [[1, 2], [1], [2, 3], [4], [1], [2], [1, 4], [3], [1, 2], [2]]; // test_ids per visit
  const orders = []; // {orderId, testId, visitId}
  for (let i = 0; i < visits.length; i++) {
    const v = visits[i];
    const tests = (testPlan[i] || [1]).map((test_id) => ({ test_id, urgency: i % 3 === 0 ? "Urgent" : "Routine" }));
    const res = await post("/api/doctor/lab-orders", docJwt, { patient_id: v.patient_id, visit_id: v.visit_id, tests });
    if (!res.ok) { console.log(`  ✗ order visit ${v.visit_id}: ${res.json?.error || res.status}`); continue; }
    for (const o of res.json.orders || []) orders.push({ orderId: o.order_id, testId: o.test_id, visitId: v.visit_id });
    console.log(`  ✓ visit ${v.visit_id}: ordered ${tests.map((t) => t.test_id).join(",")}`);
  }
  console.log(`created ${orders.length} lab orders`);

  // Collect samples for ~60% (leave some Pending for the Sample Collection screen)
  const specimens = ["Whole Blood (EDTA)", "Serum", "Urine", "Plasma"];
  let collected = 0;
  for (let i = 0; i < orders.length; i++) {
    if (i % 5 === 4) continue; // leave ~20% pending
    const r = await post("/api/lab/sample", labJwt, { order_id: orders[i].orderId, specimen_type: specimens[i % specimens.length] });
    if (r.ok) collected++;
  }
  console.log(`collected ${collected} samples`);

  // Enter results for orders whose test has parameters (1,2,3). Inject one critical low Hb.
  let resulted = 0, criticalDone = false;
  for (const o of orders) {
    const ps = paramsByTest[o.testId];
    if (!ps) continue; // test 4 has no params
    const results = ps.map((p) => {
      const lo = Number(p.reference_range_min), hi = Number(p.reference_range_max);
      let val;
      if (!criticalDone && /h(ae)?moglobin|hb/i.test(p.parameter_name) && Number.isFinite(lo)) { val = Math.max(1, lo - 4); criticalDone = true; } // critical low
      else if (Number.isFinite(lo) && Number.isFinite(hi)) val = Math.round(((lo + hi) / 2) * 10) / 10; // normal mid-range
      else val = "Negative";
      return { parameter_id: p.parameter_id, result_value: String(val) };
    });
    const r = await post("/api/lab/results", labJwt, { order_id: o.orderId, results });
    if (r.ok) resulted++;
    if (resulted >= 6) break; // enough resulted; leave others collected/pending
  }
  console.log(`entered results for ${resulted} orders${criticalDone ? " (incl. 1 critical)" : ""}`);

  // Cashier: settle the due that lab->bill just created. Full / partial / leave-open.
  const dueBills = (await pool.query(`
    select b.bill_id, coalesce(b.total_amount,0) - coalesce(x.paid,0) as due
    from bill b
    left join (select bill_id, sum(amount) paid from cashier_payment_txn group by bill_id) x on x.bill_id = b.bill_id
    where coalesce(b.total_amount,0) - coalesce(x.paid,0) > 0
    order by b.bill_id desc
  `)).rows;
  console.log(`bills with due after lab->bill: ${dueBills.length}`);
  let full = 0, partial = 0;
  for (let i = 0; i < dueBills.length; i++) {
    const b = dueBills[i];
    if (i % 3 === 2) continue; // leave ~1/3 open for the Collect worklist
    const due = Number(b.due);
    const amount = i % 3 === 1 ? Math.max(1, Math.floor(due / 2)) : due; // every 2nd = partial
    const r = await post("/api/cashier/settle", cashJwt, { billId: b.bill_id, amount, paymentType: i % 2 ? "CARD" : "CASH" }, { "Idempotency-Key": randomUUID() });
    if (r.ok) { if (amount >= due) full++; else partial++; }
    else console.log(`  ✗ settle bill ${b.bill_id}: ${r.json?.error || r.status}`);
  }
  console.log(`settled: ${full} full, ${partial} partial, left ~${Math.floor(dueBills.length / 3)} open`);

  // summary
  const s = {
    lab_order: (await pool.query("select count(*)::int c from lab_order")).rows[0].c,
    pending: (await pool.query("select count(*)::int c from lab_order where status='Pending'")).rows[0].c,
    results: (await pool.query("select count(*)::int c from lab_test_results")).rows[0].c,
    payments: (await pool.query("select count(*)::int c from cashier_payment_txn")).rows[0].c,
    openDue: (await pool.query("select count(*)::int c from bill b left join (select bill_id,sum(amount) paid from cashier_payment_txn group by bill_id) x on x.bill_id=b.bill_id where coalesce(b.total_amount,0)-coalesce(x.paid,0)>0")).rows[0].c,
  };
  console.log("\nsummary:", JSON.stringify(s));
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
