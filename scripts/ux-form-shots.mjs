// Data-gated form screenshots: select a patient via search so the clinical
// (gynae) forms render, then capture each. No DB writes.
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
  const p = await pool.query("select patient_id, patient_name from patient order by patient_id limit 1");
  const name = String(p.rows[0]?.patient_name ?? "");
  const query = name.split(" ")[0] || String(p.rows[0]?.patient_id ?? "1");
  console.log("searching:", query, "->", name);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1 });
  await ctx.addCookies([{ name: "token", value: await token("SCN_RECEP"), url: BASE, httpOnly: true, sameSite: "Lax" }]);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/receptionist`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1200);

  // select patient via shared search -> click the result row by name
  try {
    const search = page.getByPlaceholder(/Search by Name, ID, or CNIC/i).first();
    await search.click();
    await search.fill(query);
    await page.waitForTimeout(1800);
    // click the dropdown result containing the patient's name
    await page.getByRole("button").filter({ hasText: name }).first().click({ timeout: 5000 });
    await page.waitForTimeout(1500);
    console.log("  selected patient");
  } catch (e) { console.log("  select failed:", e.message); }

  // open Clinical tab, then each gynae sub-tab
  try {
    await page.getByRole("button", { name: "Clinical", exact: false }).first().click({ timeout: 5000 });
    await page.waitForTimeout(1200);
  } catch (e) { console.log("  clinical tab failed:", e.message); }

  for (const [tab, label] of [["Menstrual", "form-gynae-menstrual"], ["Pregnancy", "form-gynae-pregnancy"], ["Obstetric", "form-gynae-obstetric"], ["Para", "form-gynae-para"]]) {
    try {
      await page.getByRole("button", { name: tab, exact: false }).first().click({ timeout: 4000 });
      await page.waitForTimeout(1000);
    } catch { /* tab may already be active */ }
    await page.screenshot({ path: `${OUT}/${label}.png` });
    console.log("  ✓", label);
  }
  await browser.close();
  await pool.end();
  console.log("done.");
}
main().catch((e) => { console.error(e); process.exit(1); });
