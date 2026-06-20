// Stage C — curl-style scenario driver.
//
// Drives the live HMS API (login -> token cookie -> requests) across happy,
// auth-negative, RBAC-negative, and validation scenarios, then runs the DB
// invariant checker. Exit 0 = all scenarios + invariants hold.
//
// Prereq: the app running against the LOCAL DB (e.g. `pnpm start` after build),
// reachable at BASE_URL (default http://localhost:3000).
// Usage: node --env-file=.env.local scripts/scenario-tests/run-scenarios.mjs
//
// v1 is read-only (no seed mutation): it proves auth, RBAC, and validation are
// enforced end-to-end and that invariants hold. Write/concurrency scenarios
// (parallel oversell, append-to-bill reconciliation) are a v2 follow-up.

import { spawnSync } from "node:child_process";
import pg from "pg";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const PW = "password123";

// The suite OWNS its login fixtures — dedicated, clearly-named accounts with a
// known password — rather than depending on which seed rows happen to be
// plaintext. Codes containing "DOC" route to the doctor table in login.
const TEST_USERS = {
  admin: { code: "SCN_ADMIN", table: "staff", role: "Admin", name: "Scenario Admin" },
  recep: { code: "SCN_RECEP", table: "staff", role: "Receptionist", name: "Scenario Receptionist" },
  doctor: { code: "SCN_DOC", table: "doctor", role: "Doctor", name: "Scenario Doctor" },
};

// Idempotent upsert of the test accounts (plaintext password — login's legacy
// fallback verifies it and auto-rehashes to scrypt, preserving the value).
// Hard guard: only ever runs against a LOCAL database.
async function ensureTestUsers() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required to provision test users (run with --env-file=.env.local)");
  if (!/@(localhost|127\.0\.0\.1)\b/.test(url)) {
    throw new Error("refusing to provision test users against a non-local DB");
  }
  const pool = new pg.Pool({ connectionString: url, ssl: false });
  try {
    for (const u of [TEST_USERS.admin, TEST_USERS.recep]) {
      const upd = await pool.query(
        `UPDATE staff SET password=$2, name=$3, role=$4, employment_status='active',
           failed_login_attempts=0, account_locked_until=null WHERE user_code=$1`,
        [u.code, PW, u.name, u.role]
      );
      if (upd.rowCount === 0) {
        await pool.query(
          `INSERT INTO staff (user_code, password, name, role, employment_status)
           VALUES ($1, $2, $3, $4, 'active')`,
          [u.code, PW, u.name, u.role]
        );
      }
    }
    const d = TEST_USERS.doctor;
    const updD = await pool.query(
      `UPDATE doctor SET password=$2, doctor_name=$3, employment_status='active',
         failed_login_attempts=0, account_locked_until=null WHERE user_code=$1`,
      [d.code, PW, d.name]
    );
    if (updD.rowCount === 0) {
      await pool.query(
        `INSERT INTO doctor (user_code, password, doctor_name, specialization, consultation_fee, emergency_fee, employment_status)
         VALUES ($1, $2, $3, 'General', 0, 0, 'active')`,
        [d.code, PW, d.name]
      );
    }
  } finally {
    await pool.end();
  }
}

async function login(userCode) {
  const res = await fetch(`${BASE}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_code: userCode, password: PW }),
  });
  if (!res.ok) throw new Error(`login ${userCode} -> ${res.status}`);
  const cookies = res.headers.getSetCookie?.() ?? [];
  const token = cookies.find((c) => c.startsWith("token="));
  if (!token) throw new Error(`login ${userCode}: no token cookie`);
  return token.split(";")[0]; // "token=<jwt>"
}

async function call(method, path, { cookie, body } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (cookie) headers["Cookie"] = cookie;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return res;
}

let passed = 0;
let failed = 0;
const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  — ${detail}`}`);
}
async function expectStatus(name, p, expected) {
  try {
    const res = await p;
    record(name, res.status === expected, `expected ${expected}, got ${res.status}`);
  } catch (e) {
    record(name, false, `threw: ${e.message}`);
  }
}

function localDbUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required (run with --env-file=.env.local)");
  if (!/@(localhost|127\.0\.0\.1)\b/.test(url)) {
    throw new Error("refusing to run write scenarios against a non-local DB");
  }
  return url;
}

// WRITE SCENARIO 1 — a sensitive action (patient create) leaves an audit trail.
// Proves "audit per sensitive action" actively (vs the static presence check).
// Self-cleaning: removes the audit row + the test patient it created.
async function scenarioAuditOnSensitiveAction(cookie) {
  const pool = new pg.Pool({ connectionString: localDbUrl(), ssl: false });
  let patientId;
  try {
    const cnic = "SCN" + String(Date.now()).slice(-12); // unique per run
    const res = await call("POST", "/api/patient", {
      cookie,
      body: { patient_name: "SCN Audit Patient", gender: "Other", cnic },
    });
    if (res.status !== 200) {
      record("audit: POST /api/patient (authed) -> 200", false, `got ${res.status}`);
      return;
    }
    const body = await res.json();
    patientId = body.patient_id;
    record("audit: POST /api/patient (authed) -> 200", patientId != null, "no patient_id in response");

    const { rows } = await pool.query(
      `SELECT count(*)::int AS n FROM audit_logs WHERE action='patient.create' AND entity_id = $1`,
      [String(patientId)]
    );
    record(
      "audit: patient.create writes a matching audit_logs row",
      Number(rows[0]?.n) === 1,
      `found ${rows[0]?.n} audit rows for patient ${patientId}`
    );
  } catch (e) {
    record("audit: sensitive-action audit scenario", false, `threw: ${e.message}`);
  } finally {
    try {
      if (patientId != null) {
        await pool.query(`DELETE FROM audit_logs WHERE action='patient.create' AND entity_id = $1`, [String(patientId)]);
        await pool.query(`DELETE FROM patient WHERE patient_id = $1`, [patientId]);
      }
    } catch {
      /* best-effort cleanup */
    }
    await pool.end();
  }
}

// WRITE SCENARIO 2 — concurrent decrements cannot drive stock below zero.
// Fires ATTEMPTS parallel single-unit decrements at a fresh batch with INITIAL
// stock; the medicine_batch CHECK (stock_quantity >= 0) — the same guard the
// stock trigger relies on — must abort every decrement that would go negative.
// Self-cleaning: deletes the dedicated test batch + medicine.
async function scenarioConcurrencyOversell() {
  const INITIAL = 5;
  const ATTEMPTS = 12;
  const pool = new pg.Pool({ connectionString: localDbUrl(), ssl: false, max: ATTEMPTS });
  let medId;
  let batchId;
  try {
    const med = await pool.query(
      `INSERT INTO medicine (generic_name, brand_name, category, is_active)
       VALUES ('SCN_OVERSELL_MED','SCN_OVERSELL','SCN_TEST', true) RETURNING medicine_id`
    );
    medId = med.rows[0].medicine_id;
    const batch = await pool.query(
      `INSERT INTO medicine_batch (medicine_id, stock_quantity, sale_price)
       VALUES ($1, $2, 10) RETURNING batch_id`,
      [medId, INITIAL]
    );
    batchId = batch.rows[0].batch_id;

    const outcomes = await Promise.all(
      Array.from({ length: ATTEMPTS }, () =>
        pool
          .query(`UPDATE medicine_batch SET stock_quantity = stock_quantity - 1 WHERE batch_id = $1`, [batchId])
          .then(() => ({ ok: true }))
          .catch((e) => ({ ok: false, code: e.code }))
      )
    );
    const successes = outcomes.filter((o) => o.ok).length;
    const failures = outcomes.filter((o) => !o.ok);
    const allCheckViolations = failures.length === 0 || failures.every((f) => f.code === "23514");
    const { rows } = await pool.query(`SELECT stock_quantity FROM medicine_batch WHERE batch_id = $1`, [batchId]);
    const finalStock = Number(rows[0]?.stock_quantity);

    record(
      `concurrency: ${ATTEMPTS} parallel decrements on stock=${INITIAL} -> exactly ${INITIAL} succeed`,
      successes === INITIAL,
      `succeeded ${successes}, expected ${INITIAL}`
    );
    record(
      "concurrency: stock never negative (final=0; CHECK aborts the oversell attempts)",
      finalStock === 0 && allCheckViolations,
      `final stock ${finalStock}, failure codes=[${failures.map((f) => f.code).join(",")}]`
    );
  } catch (e) {
    record("concurrency: oversell scenario", false, `threw: ${e.message}`);
  } finally {
    try {
      if (batchId != null) await pool.query(`DELETE FROM medicine_batch WHERE batch_id = $1`, [batchId]);
      if (medId != null) await pool.query(`DELETE FROM medicine WHERE medicine_id = $1`, [medId]);
    } catch {
      /* best-effort cleanup */
    }
    await pool.end();
  }
}

// WRITE SCENARIO 3 — full IPD lifecycle end-to-end via the live API.
// Seeds a persistent SCN ward/room/bed, then admit -> advance -> order -> MAR ->
// view running bill -> discharge, asserting statuses + bill math. Self-cleaning:
// deletes the admission (cascades children) and resets the bed to vacant.
async function scenarioIpdLifecycle(adminCookie) {
  const pool = new pg.Pool({ connectionString: localDbUrl(), ssl: false });
  let admissionId;
  let bedId;
  try {
    // fixtures: a vacant SCN bed (daily_rate 2000) — find-or-create (no unique on names)
    let w = (await pool.query(`SELECT ward_id FROM ward WHERE name='SCN Ward' LIMIT 1`)).rows[0]?.ward_id;
    if (!w) w = (await pool.query(`INSERT INTO ward (name, ward_type) VALUES ('SCN Ward','general') RETURNING ward_id`)).rows[0].ward_id;
    let r = (await pool.query(`SELECT room_id FROM room WHERE ward_id=$1 AND room_number='SCN-R1' LIMIT 1`, [w])).rows[0]?.room_id;
    if (!r) r = (await pool.query(`INSERT INTO room (ward_id, room_number, default_daily_rate) VALUES ($1,'SCN-R1',2000) RETURNING room_id`, [w])).rows[0].room_id;
    bedId = (await pool.query(`SELECT bed_id FROM bed WHERE room_id=$1 AND bed_number='SCN-B1' LIMIT 1`, [r])).rows[0]?.bed_id;
    if (!bedId) bedId = (await pool.query(`INSERT INTO bed (room_id, bed_number, daily_rate, status) VALUES ($1,'SCN-B1',2000,'vacant') RETURNING bed_id`, [r])).rows[0].bed_id;
    // clear any dangling admission from a prior crashed run, then free the bed
    const dangling = (await pool.query(`SELECT admission_id FROM admission WHERE current_bed_id=$1`, [bedId])).rows;
    for (const d of dangling) {
      await pool.query(`DELETE FROM patient_vitals WHERE admission_id=$1`, [d.admission_id]);
      await pool.query(`DELETE FROM admission WHERE admission_id=$1`, [d.admission_id]);
    }
    await pool.query(`UPDATE bed SET status='vacant' WHERE bed_id=$1`, [bedId]);

    const patientId = (await pool.query(`SELECT patient_id FROM patient ORDER BY patient_id LIMIT 1`)).rows[0].patient_id;

    // admit (direct admit, no visit — keeps cleanup simple)
    const admitRes = await call("POST", "/api/ipd/admissions", { cookie: adminCookie, body: { patient_id: patientId, bed_id: bedId, admission_type: "direct" } });
    const admitBody = await admitRes.json().catch(() => ({}));
    admissionId = admitBody.admissionId;
    record("ipd: POST /api/ipd/admissions (admin) -> 201", admitRes.status === 201 && admissionId != null, `status ${admitRes.status}`);
    if (!admissionId) return;

    const advRes = await call("POST", `/api/ipd/admissions/${admissionId}/advances`, { cookie: adminCookie, body: { amount: 5000, payment_type: "CASH" } });
    record("ipd: POST advances 5000 -> 201", advRes.status === 201, `status ${advRes.status}`);

    const ordRes = await call("POST", "/api/ipd/orders", { cookie: adminCookie, body: { admission_id: admissionId, order_type: "medication", medication: { drug_name: "SCN Test Drug", dose: "500mg", route: "oral", frequency: "TDS" } } });
    const ordBody = await ordRes.json().catch(() => ({}));
    record("ipd: POST /api/ipd/orders (medication) -> 201", ordRes.status === 201 && ordBody.medOrderId != null, `status ${ordRes.status}`);

    if (ordBody.medOrderId) {
      const marRes = await call("POST", "/api/ipd/nurse/mar", { cookie: adminCookie, body: { med_order_id: ordBody.medOrderId, action: "given", dose_given: "500mg" } });
      record("ipd: POST /api/ipd/nurse/mar (given) -> 201", marRes.status === 201, `status ${marRes.status}`);
    }

    const detailRes = await call("GET", `/api/ipd/admissions/${admissionId}`, { cookie: adminCookie });
    const detail = await detailRes.json().catch(() => ({}));
    const charges = Number(detail?.bill?.total_charges ?? -1);
    const advances = Number(detail?.bill?.total_advances ?? -1);
    const balance = Number(detail?.bill?.balance_due ?? NaN);
    record(
      "ipd: running bill = charges - advances (advance 5000, 1-day room rent 2000)",
      detailRes.status === 200 && advances === 5000 && charges === 2000 && balance === charges - advances,
      `charges=${charges} advances=${advances} balance=${balance}`
    );

    const dischRes = await call("POST", `/api/ipd/admissions/${admissionId}/discharge`, { cookie: adminCookie, body: { discharge_type: "normal" } });
    record("ipd: POST discharge -> 200", dischRes.status === 200, `status ${dischRes.status}`);
  } catch (e) {
    record("ipd: lifecycle scenario", false, `threw: ${e.message}`);
  } finally {
    try {
      if (admissionId != null) {
        await pool.query(`DELETE FROM patient_vitals WHERE admission_id=$1`, [admissionId]);
        await pool.query(`DELETE FROM admission WHERE admission_id=$1`, [admissionId]);
      }
      if (bedId != null) await pool.query(`UPDATE bed SET status='vacant' WHERE bed_id=$1`, [bedId]);
    } catch {
      /* best-effort */
    }
    await pool.end();
  }
}

const main = async () => {
  console.log(`Scenario suite against ${BASE}\n=============================`);

  // sanity: server reachable
  try {
    await fetch(`${BASE}/api/public/system-timezone`);
  } catch {
    console.error(`Server not reachable at ${BASE}. Start it first (pnpm start).`);
    process.exit(2);
  }

  console.log("Provisioning test login accounts (SCN_*) on the local DB...");
  await ensureTestUsers();

  const recept = await login(TEST_USERS.recep.code); // non-admin (Receptionist)
  const admin = await login(TEST_USERS.admin.code); // Admin
  const doctor = await login(TEST_USERS.doctor.code); // Doctor

  // --- AUTH NEGATIVE: protected data routes reject anonymous callers (401) ---
  await expectStatus("auth: GET /api/patient (no token) -> 401", call("GET", "/api/patient"), 401);
  await expectStatus("auth: GET /api/queue (no token) -> 401", call("GET", "/api/queue"), 401);
  await expectStatus("auth: GET /api/medicine (no token) -> 401", call("GET", "/api/medicine"), 401);
  await expectStatus("auth: POST /api/patient (no token) -> 401", call("POST", "/api/patient", { body: { patient_name: "X" } }), 401);

  // --- HAPPY: authenticated reads succeed (200) ---
  await expectStatus("happy: GET /api/patient (receptionist) -> 200", call("GET", "/api/patient", { cookie: recept }), 200);
  await expectStatus("happy: GET /api/medicine (receptionist) -> 200", call("GET", "/api/medicine", { cookie: recept }), 200);
  await expectStatus("happy: GET /api/doctor/getAllDoctors (receptionist) -> 200", call("GET", "/api/doctor/getAllDoctors", { cookie: recept }), 200);

  // --- VALIDATION EDGE: bad bodies rejected (400), not 500 ---
  await expectStatus("edge: POST /api/patient {empty name} -> 400", call("POST", "/api/patient", { cookie: recept, body: { patient_name: "", gender: "Male" } }), 400);
  await expectStatus("edge: POST /api/patient {bad gender} -> 400", call("POST", "/api/patient", { cookie: recept, body: { patient_name: "Test", gender: "Alien" } }), 400);

  // --- RBAC NEGATIVE: non-admin blocked from admin route (403); admin allowed (200) ---
  await expectStatus("rbac: receptionist -> GET /api/admin/staff/v2/directory -> 403", call("GET", "/api/admin/staff/v2/directory", { cookie: recept }), 403);
  await expectStatus("rbac: doctor -> GET /api/admin/staff/v2/directory -> 403", call("GET", "/api/admin/staff/v2/directory", { cookie: doctor }), 403);
  await expectStatus("rbac: admin -> GET /api/admin/staff/v2/directory -> 200", call("GET", "/api/admin/staff/v2/directory", { cookie: admin }), 200);

  // --- WRITE / INTEGRITY SCENARIOS (self-cleaning, local DB only) ---
  await scenarioAuditOnSensitiveAction(recept);
  await scenarioConcurrencyOversell();
  await scenarioIpdLifecycle(admin);

  console.log("=============================");
  console.log(`Scenarios: ${passed} passed, ${failed} failed`);

  // --- INVARIANTS: data still consistent after the run ---
  console.log("\nRunning DB invariant checker...");
  const inv = spawnSync(process.execPath, ["--env-file=.env.local", "scripts/scenario-tests/check-invariants.mjs"], {
    stdio: "inherit",
  });
  const invOk = inv.status === 0;

  console.log("=============================");
  const allOk = failed === 0 && invOk;
  console.log(allOk ? "✓ SCENARIO SUITE GREEN (scenarios + invariants)" : "✗ SCENARIO SUITE FAILED");
  process.exit(allOk ? 0 : 1);
};

main().catch((e) => {
  console.error("scenario suite error:", e.message);
  process.exit(2);
});
