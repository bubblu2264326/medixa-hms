// Pixel-verify the visit-gated forms WITHOUT any DB write: intercept the queue
// API response in the browser (page.route) and return one synthetic queued
// visit, so selecting it renders the doctor prescription/lab + vitals forms.
// Pure client-side mocking — no DB changes. Run: node --env-file=.env.local scripts/ux-mock-gated-forms.mjs
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { mkdirSync } from "node:fs";
import pkg from "pg";
const { Pool } = pkg;

const BASE = process.env.UX_BASE || "http://localhost:3000";
const OUT = "ux-shots";
const secret = new TextEncoder().encode(process.env.secret_key);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });

const NAME = "UX Verify Patient";
const QUEUE = [{
  patient_id: 1, visit_id: 990001, patient_name: NAME, clinic_number: "9001",
  doctor_name: "Ahmed Khan", status: "waiting", visit_type: "OPD",
  payment_status: "Unpaid", due_amount: 0,
}];

async function tok(userCode, isDoctor) {
  const t = isDoctor ? "doctor" : "staff";
  const col = isDoctor ? "doctor_name as name" : "name, role";
  const u = (await pool.query(`select user_code, ${col}, coalesce(session_version,1) sv from ${t} where user_code=$1`, [userCode])).rows[0];
  return new SignJWT({ user_code: u.user_code, role: isDoctor ? "Doctor" : u.role, name: u.name, sv: Number(u.sv), account_type: t })
    .setProtectedHeader({ alg: "HS256" }).setExpirationTime("8h").sign(secret);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  try {
    const shoot = async (userCode, isDoctor, queueGlob, tabs) => {
      const ctx = await browser.newContext({ viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1 });
      await ctx.addCookies([{ name: "token", value: await tok(userCode, isDoctor), url: BASE, httpOnly: true, sameSite: "Lax" }]);
      const page = await ctx.newPage();
      // mock the queue endpoint -> one synthetic waiting visit (no DB write)
      await page.route(queueGlob, (route) =>
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(QUEUE) })
      );
      const route = isDoctor ? "/doctor" : "/receptionist";
      await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(1500);
      // click the queue card (unique "Visit #990001" text) to set patient+visit context
      try {
        await page.getByText(/Visit\s*#?990001/i).first().click({ timeout: 6000 });
        await page.waitForTimeout(1600);
      } catch (e) {
        try { await page.getByText(NAME, { exact: false }).first().click({ timeout: 4000 }); await page.waitForTimeout(1600); }
        catch (e2) { console.log("  queue-select failed:", e2.message); }
      }
      for (const [tab, label] of tabs) {
        try { await page.getByRole("button", { name: tab, exact: false }).first().click({ timeout: 4000 }); await page.waitForTimeout(1300); } catch {}
        await page.screenshot({ path: `${OUT}/${label}.png` });
        console.log("  ✓", label);
      }
      await ctx.close();
    };

    await shoot("DOC001", true, "**/api/doctor/queue**", [["Medicines", "gated-dr-medicines"], ["Labs", "gated-dr-labs"]]);
    await shoot("SCN_RECEP", false, "**/api/queue**", [["Vitals", "gated-vitals"]]);
  } finally {
    await browser.close();
    await pool.end();
  }
  console.log("done.");
}
main().catch((e) => { console.error(e); process.exit(1); });
