// UX screenshot harness.
//
// Logs into every workspace by MINTING a signed `token` cookie for a real DB
// user (no password, no lockout). Middleware + getAuthenticatedUser both pass
// because we omit `sid` (the session-row checks are skipped when sid is falsy).
// Captures each screen at the owner's effective viewport so density/layout can
// be audited and iterated.
//
// Run:  node --env-file=.env.local scripts/ux-shots.mjs
// Opts (env): UX_BASE (default http://localhost:3000), UX_W, UX_H, UX_FULL=1
//
// Output: ux-shots/<label>.png   (gitignored working artifacts)

import { chromium } from "playwright";
import { SignJWT } from "jose";
import { mkdirSync } from "node:fs";
import pkg from "pg";
const { Pool } = pkg;

const BASE = process.env.UX_BASE || "http://localhost:3000";
const VW = Number(process.env.UX_W || 1536); // 1920 / 1.25 (owner @125% scale)
const VH = Number(process.env.UX_H || 864);
const FULL = process.env.UX_FULL === "1";
const OUT = "ux-shots";

if (!process.env.secret_key) throw new Error("secret_key missing (run with --env-file=.env.local)");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing");
const secret = new TextEncoder().encode(process.env.secret_key);

// route -> which DB user_code to authenticate as
const TARGETS = [
  { route: "/", label: "00-login", user: null },
  { route: "/receptionist", label: "01-reception", user: "SCN_RECEP" },
  { route: "/pharmacy", label: "02-pharmacy-pos", user: "STF002" },
  { route: "/cashier", label: "03-cashier", user: "STF004" },
  { route: "/doctor", label: "04-doctor", user: "DOC001" },
  { route: "/lab", label: "05-lab", user: "STF003" },
  { route: "/admin", label: "06-admin", user: "ADM001" },
  { route: "/ipd", label: "07-ipd", user: "ADM001" },
  { route: "/attendance/kiosk", label: "08-attendance", user: null },
];

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });

async function resolveUser(userCode) {
  // doctor codes contain DOC (mirror login route heuristic)
  if (userCode.toUpperCase().includes("DOC")) {
    const r = await pool.query(
      "select user_code, doctor_name as name, coalesce(session_version,1) sv from doctor where user_code=$1 limit 1",
      [userCode]
    );
    if (!r.rows[0]) throw new Error(`doctor ${userCode} not found`);
    return { ...r.rows[0], role: "Doctor", account_type: "doctor" };
  }
  const r = await pool.query(
    "select user_code, name, role, coalesce(session_version,1) sv from staff where user_code=$1 limit 1",
    [userCode]
  );
  if (!r.rows[0]) throw new Error(`staff ${userCode} not found`);
  return { ...r.rows[0], account_type: "staff" };
}

async function mintToken(u) {
  return await new SignJWT({
    user_code: u.user_code,
    role: u.role,
    name: u.name,
    sv: Number(u.sv),
    account_type: u.account_type,
    // sid intentionally omitted -> API session-row validation skipped
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("8h")
    .sign(secret);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  console.log(`base=${BASE} viewport=${VW}x${VH} full=${FULL}`);

  for (const t of TARGETS) {
    const context = await browser.newContext({
      viewport: { width: VW, height: VH },
      deviceScaleFactor: 1,
    });
    try {
      if (t.user) {
        const u = await resolveUser(t.user);
        const token = await mintToken(u);
        await context.addCookies([
          { name: "token", value: token, url: BASE, httpOnly: true, sameSite: "Lax" },
        ]);
      }
      const page = await context.newPage();
      await page.goto(`${BASE}${t.route}`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(1500); // let client fetches/animations settle
      const path = `${OUT}/${t.label}.png`;
      await page.screenshot({ path, fullPage: FULL });
      console.log(`  ✓ ${t.label.padEnd(18)} ${t.route}  -> ${path}`);
    } catch (e) {
      console.log(`  ✗ ${t.label.padEnd(18)} ${t.route}  ERR ${e.message}`);
    } finally {
      await context.close();
    }
  }

  await browser.close();
  await pool.end();
  console.log("done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
