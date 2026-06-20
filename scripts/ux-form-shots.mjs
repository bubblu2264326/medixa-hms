// Data-gated form screenshots: select a patient via search so the clinical/
// vitals forms actually render, then capture them. No DB writes.
// Run: node --env-file=.env.local scripts/ux-form-shots.mjs
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { mkdirSync } from "node:fs";
import pkg from "pg";
const { Pool } = pkg;

const BASE = process.env.UX_BASE || "http://localhost:3000";
const OUT = "ux-shots";
const secret = new TextEncoder().encode(process.env.secret_key);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });

async function token(userCode) {
  const r = await pool.query("select user_code, name, role, coalesce(session_version,1) sv from staff where user_code=$1", [userCode]);
  const u = r.rows[0];
  return new SignJWT({ user_code: u.user_code, role: u.role, name: u.name, sv: Number(u.sv), account_type: "staff" })
    .setProtectedHeader({ alg: "HS256" }).setExpirationTime("8h").sign(secret);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  // pick a real patient id to search for
  const p = await pool.query("select patient_id, patient_name from patient order by patient_id limit 1");
  const query = String(p.rows[0]?.patient_id ?? "1");
  console.log("searching patient:", query, p.rows[0]?.patient_name);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1 });
  await ctx.addCookies([{ name: "token", value: await token("SCN_RECEP"), url: BASE, httpOnly: true, sameSite: "Lax" }]);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/receptionist`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1200);

  // select a patient via the shared search (sets PatientIdContext)
  try {
    const search = page.getByPlaceholder(/Search by Name, ID, or CNIC/i).first();
    await search.fill(query);
    await page.waitForTimeout(1500);
    await search.press("ArrowDown");
    await search.press("Enter");
    await page.waitForTimeout(1500);
  } catch (e) { console.log("select failed:", e.message); }

  for (const [tab, label] of [["Vitals", "form-vitals"], ["Clinical", "form-clinical"]]) {
    try {
      await page.getByRole("button", { name: tab, exact: false }).first().click({ timeout: 5000 });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${OUT}/${label}.png` });
      console.log("  ✓", label);
    } catch (e) { console.log("  ✗", label, e.message); }
  }
  await browser.close();
  await pool.end();
  console.log("done.");
}
main().catch((e) => { console.error(e); process.exit(1); });
