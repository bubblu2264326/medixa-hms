// Pixel-verify the IPD chart with no DB write: mock admissions list + detail +
// orders + mar, click the admission. Run: node --env-file=.env.local scripts/ux-mock-ipd.mjs
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { mkdirSync } from "node:fs";
import pkg from "pg";
const { Pool } = pkg;
const BASE = process.env.UX_BASE || "http://localhost:3000";
const OUT = "ux-shots";
const secret = new TextEncoder().encode(process.env.secret_key);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });

const ADM = {
  admission_id: 1, admission_no: "ADM-001", patient_id: 1, patient_name: "UX Verify Patient",
  status: "admitted", admission_datetime: "2026-06-21T09:00:00Z", bed_no: "SCN-B1", bed_number: "SCN-B1",
  ward_name: "SCN WARD", doctor_name: "Ahmed Khan", balance_due: 1000, total_charges: 1000, total_advances: 0,
};
const DETAIL = { admission: ADM, charges: [], advances: [], balance: { total: 1000, paid: 0, due: 1000 } };

async function main() {
  mkdirSync(OUT, { recursive: true });
  const u = (await pool.query("select user_code, name, role, coalesce(session_version,1) sv from staff where user_code='ADM001'")).rows[0];
  const token = await new SignJWT({ user_code: u.user_code, role: u.role, name: u.name, sv: Number(u.sv), account_type: "staff" })
    .setProtectedHeader({ alg: "HS256" }).setExpirationTime("8h").sign(secret);
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1 });
    await ctx.addCookies([{ name: "token", value: token, url: BASE, httpOnly: true, sameSite: "Lax" }]);
    const page = await ctx.newPage();
    const json = (body) => (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    await page.route("**/api/ipd/admissions?status=admitted", json([ADM]));
    await page.route("**/api/ipd/admissions/1", json(DETAIL));
    await page.route("**/api/ipd/orders**", json([]));
    await page.route("**/api/ipd/nurse/mar**", json([]));
    await page.goto(`${BASE}/ipd`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1500);
    try { await page.getByRole("button", { name: /^Open$/i }).first().click({ timeout: 6000 }); await page.waitForTimeout(1800); } catch (e) { console.log("open click:", e.message); }
    await page.screenshot({ path: `${OUT}/gated-ipd-chart.png` });
    console.log("  ✓ gated-ipd-chart");
    await ctx.close();
  } finally { await browser.close(); await pool.end(); }
  console.log("done.");
}
main().catch((e) => { console.error(e); process.exit(1); });
