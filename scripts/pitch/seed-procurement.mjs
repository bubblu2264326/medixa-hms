// Phase 2 — establish stock + ledger ONLY through the purchase flow.
// Mints a pharmacist token and POSTs realistic purchase invoices to
// /api/pharmacy/purchase, so the trigger chain (tg_*_detail_to_txn ->
// tg_stockquantity_generic) fills medicine_batch stock + medicine_transaction.
// Idempotent-ish: only stocks medicines that have NO batch yet, so re-runs
// don't pile up. Leaves a few items low-stock / zero for realistic alerts.
//
// Run:  node --env-file=.env.local scripts/pitch/seed-procurement.mjs

import { SignJWT } from "jose";
import pkg from "pg";
const { Pool } = pkg;

const BASE = process.env.UX_BASE || "http://localhost:3100";
if (!process.env.secret_key || !process.env.DATABASE_URL) throw new Error("run with --env-file=.env.local");
const secret = new TextEncoder().encode(process.env.secret_key);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });

async function token(userCode) {
  const r = await pool.query("select user_code, name, role, coalesce(session_version,1) sv from staff where user_code=$1", [userCode]);
  if (!r.rows[0]) throw new Error(`staff ${userCode} not found`);
  const u = r.rows[0];
  return await new SignJWT({ user_code: u.user_code, role: u.role, name: u.name, sv: Number(u.sv), account_type: "staff" })
    .setProtectedHeader({ alg: "HS256" }).setExpirationTime("8h").sign(secret);
}

// deterministic pricing by form (no randomness -> reproducible)
function priceFor(form, id) {
  const f = String(form || "").toLowerCase();
  let cost;
  if (/tablet|capsule/.test(f)) cost = 3 + (id % 18);
  else if (/syrup|suspension|drops/.test(f)) cost = 70 + (id % 9) * 18;
  else if (/injection|vial/.test(f)) cost = 120 + (id % 12) * 60;
  else if (/solution/.test(f)) cost = 90 + (id % 8) * 25;
  else if (/device/.test(f)) cost = 150 + (id % 20) * 90;
  else if (/consumable|ointment|sachet/.test(f)) cost = 30 + (id % 15) * 22;
  else cost = 50 + (id % 10) * 10;
  const sale = Math.round(cost * 1.35);
  return { cost, sale };
}

const EXP = ["2027-12-31", "2028-06-30", "2027-09-30", "2028-03-31", "2027-06-30"];
const NEAR = "2026-09-30"; // near-expiry for the watchlist

async function postPurchase(jwt, partyId, items, label) {
  const total = items.reduce((a, it) => a + it.quantity * it.unit_cost, 0);
  const res = await fetch(`${BASE}/api/pharmacy/purchase`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: `token=${jwt}` },
    body: JSON.stringify({ party_id: partyId, total_amount: total, payment_status: "Paid", items }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j?.success === false) { console.log(`  ✗ ${label}: ${j?.error || res.status}`); return false; }
  console.log(`  ✓ ${label}: invoice ${j?.data?.invoice_no} (${items.length} lines, Rs ${total})`);
  return true;
}

function lineFor(m, qty, expiry, batchSuffix = "A") {
  const { cost, sale } = priceFor(m.form, m.medicine_id);
  return {
    medicine_id: m.medicine_id,
    quantity: qty,
    unit_cost: cost,
    sub_quantity: 0,
    sub_unit_cost: 0,
    batch_number: `B${m.medicine_id}-${batchSuffix}`,
    expiry_date: expiry,
    sale_price: sale,
    sale_sub_unit_price: 0,
  };
}

async function main() {
  const jwt = await token("STF002");
  const parties = (await pool.query("select party_id, name from party order by party_id")).rows;
  if (parties.length < 4) throw new Error("need >=4 suppliers");
  // only stock medicines that have NO batch yet (keeps re-runs idempotent)
  const meds = (await pool.query(`
    select m.medicine_id, m.brand_name, m.form
    from medicine m
    left join (select medicine_id, count(*) c from medicine_batch group by medicine_id) b on b.medicine_id=m.medicine_id
    where m.is_active = true and coalesce(b.c,0) = 0
    order by m.medicine_id
  `)).rows;
  console.log(`unstocked medicines to procure: ${meds.length}; suppliers: ${parties.length}`);
  if (meds.length === 0) { console.log("nothing to do (all stocked)"); await pool.end(); return; }

  // Partition: leave last ~12 untouched (zero stock), 6 before that = low-stock refill.
  const zeroLeave = meds.slice(-12);
  const lowStock = meds.slice(-18, -12);
  const stocked = meds.slice(0, -18);
  const third = Math.ceil(stocked.length / 3);
  const bulk = stocked.slice(0, third);
  const supB = stocked.slice(third, third * 2);
  const supC = stocked.slice(third * 2);

  // Bulk purchase — supplier 1, high quantities
  await postPurchase(jwt, parties[0].party_id, bulk.map((m, i) => lineFor(m, 80 + (i % 5) * 30, EXP[i % EXP.length])), "BULK purchase (supplier 1)");
  // Multi-supplier — suppliers 2 & 3
  await postPurchase(jwt, parties[1].party_id, supB.map((m, i) => lineFor(m, 40 + (i % 4) * 20, EXP[(i + 1) % EXP.length])), "Multi-supplier (supplier 2)");
  await postPurchase(jwt, parties[2].party_id, supC.map((m, i) => lineFor(m, 25 + (i % 4) * 15, i % 6 === 0 ? NEAR : EXP[(i + 2) % EXP.length])), "Multi-supplier (supplier 3)");
  // Low-stock refill — supplier 4, tiny quantities (below threshold)
  await postPurchase(jwt, parties[3].party_id, lowStock.map((m) => lineFor(m, 3, EXP[0])), "Low-stock refill (supplier 4)");
  // Mixed batch/expiry — second batch for first 3 bulk items (different batch + earlier expiry => FEFO)
  if (bulk.length >= 3) {
    await postPurchase(jwt, parties[0].party_id, bulk.slice(0, 3).map((m) => lineFor(m, 30, NEAR, "B")), "Mixed batch/expiry (second batch)");
  }

  // Verify
  const tx = (await pool.query("select count(*)::int c from medicine_transaction")).rows[0].c;
  const inStock = (await pool.query("select count(*)::int c from medicine_batch where coalesce(stock_quantity,0) > 0")).rows[0].c;
  const lowCnt = (await pool.query(`
    select count(*)::int c from medicine m
    join (select medicine_id, sum(coalesce(stock_quantity,0)) s from medicine_batch group by medicine_id) b on b.medicine_id=m.medicine_id
    where b.s > 0 and b.s < coalesce(m.min_stock_level,10)
  `)).rows[0].c;
  console.log(`\nledger rows: ${tx} | batches in stock: ${inStock} | low-stock items: ${lowCnt} | left zero: ${zeroLeave.length}`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
