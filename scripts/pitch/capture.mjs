// Pitch capture harness — logs in per role (mints a token cookie for a real DB
// user, like ux-shots) and captures annotated screenshots for the product PDFs.
// For each module it writes pitch/shots/<module>/<label>.png plus a manifest.json
// (title/subtitle + per-shot caption + blurb) that build-pdf.mjs renders.
//
// Run:  MODULE=pharmacy node --env-file=.env.local scripts/pitch/capture.mjs
//       MODULE=all      node --env-file=.env.local scripts/pitch/capture.mjs

import { chromium } from "playwright";
import { SignJWT } from "jose";
import { mkdirSync, writeFileSync } from "node:fs";
import pkg from "pg";
const { Pool } = pkg;

const BASE = process.env.UX_BASE || "http://localhost:3100";
const VW = Number(process.env.UX_W || 1536);
const VH = Number(process.env.UX_H || 864);

if (!process.env.secret_key) throw new Error("secret_key missing (run with --env-file=.env.local)");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing");
const secret = new TextEncoder().encode(process.env.secret_key);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });

// ── Module definitions ──────────────────────────────────────────────────────
// caption = bold label under the shot; blurb = one tight sentence of pitch copy.
const MODULES = {
  pharmacy: {
    title: "Pharmacy & Point-of-Sale",
    subtitle: "Retail dispensing, inventory, and supplier operations in one terminal",
    user: "STF002",
    shots: [
      { label: "pos", route: "/pharmacy", caption: "Point-of-Sale terminal", blurb: "Keyboard-first dispensing: search by brand or generic, automatic batch selection, live totals and change, and a single dominant Pay action." },
      { label: "products", route: "/pharmacy?tab=medicines", caption: "Medicine catalogue", blurb: "Every product with form, strength, manufacturer and live multi-batch stock — full-text searchable." },
      { label: "purchases", route: "/pharmacy?tab=purchases", caption: "Purchase invoices", blurb: "Supplier purchases recorded against batches; stock is updated automatically through the database trigger chain." },
      { label: "transactions", route: "/pharmacy?tab=transactions", caption: "Sales ledger", blurb: "Every completed sale with reference, items and amount — the audit trail behind the till." },
      { label: "parties", route: "/pharmacy?tab=addParty", caption: "Suppliers", blurb: "Supplier master with contact and tax details, linked to every purchase and batch." },
      { label: "reports", route: "/pharmacy?tab=reports", caption: "Pharmacy reporting", blurb: "Daily sales and stock movement summaries for the pharmacy desk." },
    ],
  },
};

async function resolveUser(userCode) {
  if (userCode.toUpperCase().includes("DOC")) {
    const r = await pool.query("select user_code, doctor_name as name, coalesce(session_version,1) sv from doctor where user_code=$1 limit 1", [userCode]);
    if (!r.rows[0]) throw new Error(`doctor ${userCode} not found`);
    return { ...r.rows[0], role: "Doctor", account_type: "doctor" };
  }
  const r = await pool.query("select user_code, name, role, coalesce(session_version,1) sv from staff where user_code=$1 limit 1", [userCode]);
  if (!r.rows[0]) throw new Error(`staff ${userCode} not found`);
  return { ...r.rows[0], account_type: "staff" };
}

async function mintToken(u) {
  return await new SignJWT({ user_code: u.user_code, role: u.role, name: u.name, sv: Number(u.sv), account_type: u.account_type })
    .setProtectedHeader({ alg: "HS256" }).setExpirationTime("8h").sign(secret);
}

async function captureModule(browser, key, def) {
  const dir = `pitch/shots/${key}`;
  mkdirSync(dir, { recursive: true });
  const manifestShots = [];
  console.log(`\n[${key}] ${def.title}`);
  for (const s of def.shots) {
    const user = s.user || def.user;
    const context = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2 });
    try {
      if (user) {
        const u = await resolveUser(user);
        const token = await mintToken(u);
        await context.addCookies([{ name: "token", value: token, url: BASE, httpOnly: true, sameSite: "Lax" }]);
      }
      const page = await context.newPage();
      await page.goto(`${BASE}${s.route}`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(1600);
      if (s.clicks) {
        for (const label of s.clicks) {
          try { await page.getByRole("button", { name: label, exact: false }).first().click({ timeout: 5000 }); await page.waitForTimeout(1000); }
          catch { /* keep current view */ }
        }
      }
      const file = `${s.label}.png`;
      await page.screenshot({ path: `${dir}/${file}`, fullPage: false });
      manifestShots.push({ label: s.label, caption: s.caption, blurb: s.blurb, file });
      console.log(`  ✓ ${s.label.padEnd(14)} ${s.route}`);
    } catch (e) {
      console.log(`  ✗ ${s.label.padEnd(14)} ${s.route}  ERR ${e.message}`);
    } finally {
      await context.close();
    }
  }
  writeFileSync(`${dir}/manifest.json`, JSON.stringify({ key, title: def.title, subtitle: def.subtitle, shots: manifestShots }, null, 2));
  console.log(`  → ${dir}/manifest.json (${manifestShots.length} shots)`);
}

async function main() {
  const which = (process.env.MODULE || "pharmacy").toLowerCase();
  const keys = which === "all" ? Object.keys(MODULES) : [which];
  const browser = await chromium.launch();
  console.log(`base=${BASE} viewport=${VW}x${VH}`);
  for (const k of keys) {
    if (!MODULES[k]) { console.log(`! unknown module ${k}`); continue; }
    await captureModule(browser, k, MODULES[k]);
  }
  await browser.close();
  await pool.end();
  console.log("\ndone.");
}

main().catch((e) => { console.error(e); process.exit(1); });
