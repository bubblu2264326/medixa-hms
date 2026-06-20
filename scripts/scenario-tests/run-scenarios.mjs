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
