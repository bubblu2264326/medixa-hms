// Pixel-verify the cashier settle-loaded view with no DB write: mock the
// bill-context endpoint, fill Bill ID, click Load. Run: node --env-file=.env.local scripts/ux-mock-cashier.mjs
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { mkdirSync } from "node:fs";
import pkg from "pg";
const { Pool } = pkg;
const BASE = process.env.UX_BASE || "http://localhost:3000";
const OUT = "ux-shots";
const secret = new TextEncoder().encode(process.env.secret_key);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });

const BILL = {
  bill: { billId: 1, visitId: 990001, patientId: 1, patientName: "UX Verify Patient", contactNumber: "03001234567", totalAmount: 1500, paidAmount: 500, dueAmount: 1000, paymentStatus: "Partial" },
  sourceLines: [
    { billChargeSourceId: 1, sourceType: "pharmacy_sale", sourceId: 10, amount: 900, billItemId: 1, description: "Pharmacy — Brufen x2" },
    { billChargeSourceId: 2, sourceType: "consultation", sourceId: 11, amount: 600, billItemId: 2, description: "OPD Consultation" },
  ],
  paymentHistory: [
    { cashierPaymentTxnId: 1, amount: 500, txnType: "payment", paymentType: "CASH", paymentReference: null, receiptNo: "RCPT-001", createdAt: "2026-06-21T10:00:00Z", reversedFromTxnId: null },
  ],
};

async function main() {
  mkdirSync(OUT, { recursive: true });
  const u = (await pool.query("select user_code, name, role, coalesce(session_version,1) sv from staff where user_code='STF004'")).rows[0];
  const token = await new SignJWT({ user_code: u.user_code, role: u.role, name: u.name, sv: Number(u.sv), account_type: "staff" })
    .setProtectedHeader({ alg: "HS256" }).setExpirationTime("8h").sign(secret);
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1 });
    await ctx.addCookies([{ name: "token", value: token, url: BASE, httpOnly: true, sameSite: "Lax" }]);
    const page = await ctx.newPage();
    await page.route("**/api/cashier/bill/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BILL) }));
    await page.goto(`${BASE}/cashier`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1200);
    try { await page.getByRole("button", { name: "Settle", exact: false }).first().click({ timeout: 5000 }); await page.waitForTimeout(800); } catch (e) { console.log("settle tab:", e.message); }
    try { await page.getByPlaceholder(/Bill ID/i).first().fill("1"); } catch (e) { console.log("fill:", e.message); }
    try { await page.getByRole("button", { name: /Load Bill Context/i }).first().click({ timeout: 5000 }); await page.waitForTimeout(1500); } catch (e) { console.log("load:", e.message); }
    await page.screenshot({ path: `${OUT}/gated-cashier-settle.png` });
    console.log("  ✓ gated-cashier-settle");
    await ctx.close();
  } finally { await browser.close(); await pool.end(); }
  console.log("done.");
}
main().catch((e) => { console.error(e); process.exit(1); });
