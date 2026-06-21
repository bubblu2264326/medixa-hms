// Pixel-verify reception vitals with no DB write: search a real patient, then
// mock GET /api/visit/{id} so SharedSearch.handleSelect sets selectedVisitId ->
// the vitals form renders. Run: node --env-file=.env.local scripts/ux-mock-vitals.mjs
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { mkdirSync } from "node:fs";
import pkg from "pg";
const { Pool } = pkg;
const BASE = process.env.UX_BASE || "http://localhost:3000";
const OUT = "ux-shots";
const secret = new TextEncoder().encode(process.env.secret_key);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });

async function main() {
  mkdirSync(OUT, { recursive: true });
  const p = (await pool.query("select patient_id, patient_name from patient order by patient_id limit 1")).rows[0];
  const name = String(p.patient_name);
  const u = (await pool.query("select user_code, name, role, coalesce(session_version,1) sv from staff where user_code='SCN_RECEP'")).rows[0];
  const token = await new SignJWT({ user_code: u.user_code, role: u.role, name: u.name, sv: Number(u.sv), account_type: "staff" })
    .setProtectedHeader({ alg: "HS256" }).setExpirationTime("8h").sign(secret);
  console.log("patient", p.patient_id, name);

  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1 });
    await ctx.addCookies([{ name: "token", value: token, url: BASE, httpOnly: true, sameSite: "Lax" }]);
    const page = await ctx.newPage();
    // mock the active-visit lookup so a visit gets selected (no DB write)
    await page.route("**/api/visit/*", (r) =>
      r.request().method() === "GET"
        ? r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ visit_id: 990001 }) })
        : r.continue()
    );
    await page.goto(`${BASE}/receptionist`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1200);
    try {
      const s = page.getByPlaceholder(/Search by Name, ID, or CNIC/i).first();
      await s.click(); await s.fill(name.split(" ")[0]);
      await page.waitForTimeout(1800);
      await page.getByRole("button").filter({ hasText: name }).first().click({ timeout: 6000 });
      await page.waitForTimeout(1500);
    } catch (e) { console.log("select:", e.message); }
    try { await page.getByRole("button", { name: "Vitals", exact: false }).first().click({ timeout: 5000 }); await page.waitForTimeout(1300); } catch (e) { console.log("vitals tab:", e.message); }
    await page.screenshot({ path: `${OUT}/gated-vitals.png` });
    console.log("  ✓ gated-vitals");
    await ctx.close();
  } finally { await browser.close(); await pool.end(); }
  console.log("done.");
}
main().catch((e) => { console.error(e); process.exit(1); });
