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
  // pharmacy sub-tabs (URL-driven via ?tab=)
  { route: "/pharmacy?tab=purchases", label: "ph-purchases", user: "STF002" },
  { route: "/pharmacy?tab=transactions", label: "ph-transactions", user: "STF002" },
  { route: "/pharmacy?tab=addParty", label: "ph-parties", user: "STF002" },
  { route: "/pharmacy?tab=purchaseReturn", label: "ph-preturn", user: "STF002" },
  { route: "/pharmacy?tab=medicines", label: "ph-products", user: "STF002" },
  { route: "/pharmacy?tab=reports", label: "ph-reports", user: "STF002" },
  { route: "/pharmacy?tab=settings", label: "ph-settings", user: "STF002" },
  // admin sub-pages (URL-routed)
  { route: "/admin/staff", label: "ad-staff", user: "ADM001" },
  { route: "/admin/payroll", label: "ad-payroll", user: "ADM001" },
  { route: "/admin/financials", label: "ad-financials", user: "ADM001" },
  { route: "/admin/inventory", label: "ad-inventory", user: "ADM001" },
  { route: "/admin/audit", label: "ad-audit", user: "ADM001" },
  { route: "/admin/narcotics", label: "ad-narcotics", user: "ADM001" },
  { route: "/admin/attendance", label: "ad-attendance", user: "ADM001" },
  { route: "/admin/patients", label: "ad-patients", user: "ADM001" },
  { route: "/admin/analytics", label: "ad-analytics", user: "ADM001" },
  { route: "/admin/lifecycle", label: "ad-lifecycle", user: "ADM001" },
  { route: "/admin/roster", label: "ad-roster", user: "ADM001" },
  { route: "/admin/documents", label: "ad-documents", user: "ADM001" },
  { route: "/admin/credentialing", label: "ad-credentialing", user: "ADM001" },
  { route: "/admin/notifications", label: "ad-notifications", user: "ADM001" },
  { route: "/admin/leave", label: "ad-leave", user: "ADM001" },
  { route: "/admin/fbr-invoices", label: "ad-fbr", user: "ADM001" },
  { route: "/admin/approvals", label: "ad-approvals", user: "ADM001" },
  { route: "/admin/settings", label: "ad-settings", user: "ADM001" },
  { route: "/admin/staff/settings", label: "ad-staff-settings", user: "ADM001" },
  { route: "/admin/staff/security", label: "ad-staff-security", user: "ADM001" },
  { route: "/admin/staff/access", label: "ad-staff-access", user: "ADM001" },
  // reception sub-tabs (client-state — reach via button clicks)
  { route: "/receptionist", label: "rc-appointments", user: "SCN_RECEP", clicks: ["Appointments"] },
  { route: "/receptionist", label: "rc-register", user: "SCN_RECEP", clicks: ["Register"] },
  { route: "/receptionist", label: "rc-vitals", user: "SCN_RECEP", clicks: ["Vitals"] },
  { route: "/receptionist", label: "rc-clinical", user: "SCN_RECEP", clicks: ["Clinical"] },
  // cashier sub-tabs (Worklist is default = 03-cashier)
  { route: "/cashier", label: "cs-settle", user: "STF004", clicks: ["Settle"] },
  { route: "/cashier", label: "cs-history", user: "STF004", clicks: ["History"] },
  { route: "/cashier", label: "cs-drafts", user: "STF004", clicks: ["Drafts"] },
  { route: "/cashier", label: "cs-overdue", user: "STF004", clicks: ["Overdue"] },
  // lab sub-tabs (Sample Collection is default = 05-lab)
  { route: "/lab", label: "lab-results", user: "STF003", clicks: ["Test Results"] },
  { route: "/lab", label: "lab-orders", user: "STF003", clicks: ["Lab Orders"] },
  // ipd sub-tabs (Admissions is default = 07-ipd)
  { route: "/ipd", label: "ipd-bedboard", user: "ADM001", clicks: ["Bed Board"] },
];

// UX_ONLY=rc-,ph-products  -> run only labels containing any of these substrings
const ONLY = (process.env.UX_ONLY || "").split(",").map((s) => s.trim()).filter(Boolean);
const RUN = ONLY.length ? TARGETS.filter((t) => ONLY.some((o) => t.label.includes(o))) : TARGETS;

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

  for (const t of RUN) {
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
      // client-state tabs: click to reach the sub-view before shooting
      if (t.clicks) {
        for (const label of t.clicks) {
          try {
            await page.getByRole("button", { name: label, exact: false }).first().click({ timeout: 5000 });
            await page.waitForTimeout(900);
          } catch { /* button not found — shoot current view */ }
        }
      }
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
