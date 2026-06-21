// Pitch capture harness — logs in per role (mints a token cookie for a real DB
// user) and captures annotated screenshots for the product PDFs. Each module
// writes pitch/shots/<module>/<label>.png + manifest.json (title/subtitle +
// per-shot caption + blurb) that build-pdf.mjs renders.
//
// Some shots need interaction (populate POS cart, open settle drawer, open
// procurement modal, pick a doctor patient) — those use a defensive prepare(page)
// that best-effort drives the UI and never throws (falls back to the plain view).
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
if (!process.env.secret_key || !process.env.DATABASE_URL) throw new Error("run with --env-file=.env.local");
const secret = new TextEncoder().encode(process.env.secret_key);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });

const wait = (p, ms) => p.waitForTimeout(ms);
async function clickByText(page, name, ms = 800) {
  try { await page.getByRole("button", { name, exact: false }).first().click({ timeout: 4000 }); await wait(page, ms); return true; }
  catch { return false; }
}

// ── prepare() helpers for interactive shots ─────────────────────────────────
async function posSearch(page) {
  // open the medicine search dropdown (don't add) to show live search
  try {
    const search = page.getByPlaceholder(/Search Medicine/i).first();
    await search.click({ timeout: 4000 });
    await search.fill("Augmentin");
    await wait(page, 1300);
  } catch { /* */ }
}
async function posFullscreen(page) {
  await fillPos(page);
  // press the maximize (square) button; the component applies a CSS fixed-inset
  // fullscreen layout when isFullscreen flips true (after requestFullscreen).
  try {
    await page.locator('button[title="Enter Fullscreen"]').first().click({ timeout: 4000 });
    await wait(page, 1200);
  } catch {
    try { await page.keyboard.press("F10"); await wait(page, 1000); } catch { /* */ }
  }
}
async function posHold(page) {
  await fillPos(page);
  await clickByText(page, /^hold$/i, 1500);
  await wait(page, 800); // let the success toast render
}
async function fillPos(page) {
  // search + add a few medicines to the cart so the hero shot shows live totals
  const names = ["Panadol", "Augmentin", "Risek"];
  for (const name of names) {
    try {
      const search = page.getByPlaceholder(/Search Medicine/i).first();
      await search.click({ timeout: 4000 });
      await search.fill(name);
      await wait(page, 1100);
      // try clicking a dropdown option containing the name; else keyboard select
      const opt = page.locator(`text=${name}`).last();
      if (await opt.count()) { await opt.click({ timeout: 3000 }).catch(() => {}); }
      else { await page.keyboard.press("ArrowDown"); await page.keyboard.press("Enter"); }
      await wait(page, 700);
      await clickByText(page, /add to bill/i, 700);
    } catch { /* keep going */ }
  }
  await wait(page, 600);
}
async function performPurchase(page) {
  // drive the purchase form: pick supplier, search+select a medicine, fill batch
  // details, and add the line to the invoice — i.e. a purchase being recorded.
  try {
    await page.locator("select").first().selectOption({ index: 1 }).catch(() => {});
    await wait(page, 500);
    const ms = page.getByPlaceholder(/Type Brand or Generic/i).first();
    await ms.click(); await ms.fill("Brufen"); await wait(page, 1200);
    const res = page.locator("text=Brufen").last();
    if (await res.count()) await res.click({ timeout: 3000 }).catch(() => {});
    await wait(page, 700);
    await page.getByPlaceholder("BATCH-00001").fill("BCH-DEMO-07").catch(() => {});
    await page.locator('input[type="date"]').first().fill("2027-12-31").catch(() => {});
    const fillByLabel = async (label, val) => {
      try { await page.locator(`label:has-text("${label}")`).first().locator('xpath=following::input[1]').fill(String(val), { timeout: 2500 }); } catch { /* */ }
    };
    await fillByLabel("Unit Cost", 45);
    await fillByLabel("Sale Price", 62);
    await wait(page, 400);
    await page.locator('button[title="Add to cart"]').first().click({ timeout: 3000 }).catch(() => {});
    await wait(page, 900);
  } catch { /* keep current view */ }
}
function returnFrom(filterLabel) {
  // on the ledger: filter to the movement type, then start a return on the first
  // matching row (sale -> sale-return flow; purchase -> purchase-return flow)
  return async (page) => {
    try {
      await page.getByRole("button", { name: new RegExp(`^${filterLabel}$`, "i") }).first().click({ timeout: 4000 }).catch(() => {});
      await wait(page, 1000);
      const ret = page.getByRole("button", { name: /^return$/i }).first();
      if (await ret.count()) { await ret.click({ timeout: 4000 }); await wait(page, 1900); }
    } catch { /* */ }
  };
}
async function openCollect(page) {
  // open the sample-collection dialog on the first pending order
  await clickByText(page, /^collect$/i, 1400);
}
async function openResultEntry(page) {
  // on Test Results, open the entry panel/dialog for the first order
  await clickByText(page, /enter results|enter|results/i, 1400);
}
async function openSettleDrawer(page) {
  // from the Collect worklist, open the first bill into the Settle drawer
  await clickByText(page, /^open$/i, 1200) || await clickByText(page, /open/i, 1200);
}
async function openProcurement(page) {
  await clickByText(page, /new stock order/i, 1400);
}
// NOTE: factory must NOT be `async` — it returns the prepare fn synchronously.
// (An `async` factory returns Promise<fn>, so `await s.prepare(page)` would try to
//  call a Promise and throw into the harness's silent catch — the prepare never runs.)
function pickDoctorPatientThen(tab) {
  return async (page) => {
    // select the first queue card; once a patient is selected the placeholder clears.
    try {
      const card = page.locator('div[class*="cursor-pointer"][class*="rounded-md"]').first();
      await card.waitFor({ state: "visible", timeout: 12000 });
      // Let React finish hydrating before driving the card — a force-click that races
      // hydration dispatches a DOM event with no handler attached yet (selection no-ops).
      await wait(page, 2500);
      // Check selection state BEFORE each click (count() never throws), so once the
      // patient is selected we stop — clicking a selected card again can toggle it off.
      for (let i = 0; i < 8; i++) {
        const selected = (await page.getByText(/No patient selected/i).count().catch(() => 1)) === 0;
        if (selected) break;
        // normal click auto-waits for actionability (stable + receives events)
        await card.click({ timeout: 5000 }).catch(() => card.click({ force: true, timeout: 5000 }).catch(() => {}));
        await wait(page, 1400);
      }
    } catch { /* */ }
    if (tab) await clickByText(page, tab, 1800);
  };
}

// ── Module definitions ──────────────────────────────────────────────────────
const MODULES = {
  pharmacy: {
    title: "Pharmacy & Point-of-Sale", user: "STF002",
    subtitle: "Retail dispensing, inventory and supplier operations in one terminal",
    shots: [
      { label: "pos", route: "/pharmacy", caption: "Point-of-Sale terminal", blurb: "Keyboard-first dispensing with a live cart.", prepare: fillPos },
      { label: "pos-search", route: "/pharmacy", caption: "Live medicine search", blurb: "Instant brand/generic search with stock and price.", prepare: posSearch },
      { label: "pos-fullscreen", route: "/pharmacy", caption: "Full-screen Sale Mode", blurb: "Distraction-free maximised till.", prepare: posFullscreen },
      { label: "pos-hold", route: "/pharmacy", caption: "Hold & resume sales", blurb: "Park a sale and serve the next customer.", prepare: posHold },
      { label: "products", route: "/pharmacy?tab=medicines", caption: "Medicine & supply catalogue", blurb: "Medicines, consumables and devices with live multi-batch stock." },
      { label: "purchase", route: "/pharmacy?tab=purchases", caption: "Recording a purchase", blurb: "A supplier purchase being entered against a batch.", prepare: performPurchase },
      { label: "transactions", route: "/pharmacy?tab=transactions", caption: "Stock movement ledger", blurb: "Colour-coded purchases, sales and returns with batch and reference." },
      { label: "sale-return", route: "/pharmacy?tab=transactions", caption: "Sale return", blurb: "Returning a dispensed item against its original sale.", prepare: returnFrom("sale") },
      { label: "preturn", route: "/pharmacy?tab=transactions", caption: "Purchase return", blurb: "Returning received stock to a supplier against its invoice.", prepare: returnFrom("purchase") },
      { label: "parties", route: "/pharmacy?tab=addParty", caption: "Suppliers & parties", blurb: "Supplier directory linked to every purchase and batch." },
      { label: "reports", route: "/pharmacy?tab=reports", caption: "Inventory reporting", blurb: "Expiring-soon, dead-stock and medicine-stock reports with CSV export.", clicks: ["Medicine Stock"] },
    ],
  },
  cashier: {
    title: "Cashier & Billing", user: "STF004",
    subtitle: "Bill collection, settlement and shift reconciliation with an append-only ledger",
    shots: [
      { label: "collect", route: "/cashier", caption: "Collect worklist", blurb: "Outstanding bills ranked by due and aging, with 7+/30+/60+ alert chips and one-click open." },
      { label: "settle", route: "/cashier", caption: "Settle drawer", blurb: "Open a bill into a side drawer: source breakdown, payment method, change/due, and a printable receipt.", prepare: openSettleDrawer },
      { label: "history", route: "/cashier", caption: "Payment history", blurb: "Every payment and reversal — corrections are reverse-and-repost, never edits, preserving an append-only ledger.", clicks: ["History"] },
      { label: "drafts", route: "/cashier", caption: "Held drafts", blurb: "Park a partial settlement as a draft and apply it later — idempotently.", clicks: ["Drafts"] },
      { label: "shift", route: "/cashier", caption: "My Shift", blurb: "Open a cash drawer with an opening float; close it with a counted total and automatic variance.", clicks: ["My Shift"] },
    ],
  },
  doctor: {
    title: "Doctor Workspace", user: "DOC001",
    subtitle: "Encounter, prescribing, lab ordering and patient history in one clinical view",
    shots: [
      { label: "queue", route: "/doctor", caption: "Doctor queue & workspace", blurb: "The day's patients with one-click entry into the encounter workspace." },
      { label: "labs", route: "/doctor", caption: "Lab orders & results read-back", blurb: "Order tests and see results inline — including abnormal and critical flags surfaced to the ordering doctor.", prepare: pickDoctorPatientThen("Labs") },
      { label: "medicines", route: "/doctor", caption: "Prescribing", blurb: "Build a prescription against the live formulary with dosage and quantity.", prepare: pickDoctorPatientThen("Medicines") },
      { label: "history", route: "/doctor", caption: "Patient history", blurb: "Prior visits, prescriptions and lab results for continuity of care.", prepare: pickDoctorPatientThen("History") },
    ],
  },
  lab: {
    title: "Laboratory", user: "STF003",
    subtitle: "Sample collection, result entry with critical-value alerts, and verification",
    shots: [
      { label: "collection", route: "/lab", caption: "Sample collection queue", blurb: "Pending orders with patient, test and urgency." },
      { label: "collect", route: "/lab", caption: "Collecting a sample", blurb: "Record specimen type and collector against a pending order.", prepare: openCollect },
      { label: "results", route: "/lab", caption: "Result entry & critical alerts", blurb: "Parameter values against reference ranges; abnormal and critical flags.", clicks: ["Test Results"] },
      { label: "orders", route: "/lab", caption: "Lab order board", blurb: "All orders across Pending, Collected and Performed.", clicks: ["Lab Orders"] },
    ],
  },
  reception: {
    title: "Reception & Front Desk", user: "SCN_RECEP",
    subtitle: "Patient registration, appointments, vitals and live queue management",
    shots: [
      { label: "queue", route: "/receptionist", caption: "Live patient queue", blurb: "Real-time queue across clinics with status at a glance." },
      { label: "register", route: "/receptionist", caption: "Patient registration", blurb: "Register a walk-in or returning patient and start a visit in seconds.", clicks: ["Register"] },
      { label: "appointments", route: "/receptionist", caption: "Appointments", blurb: "Book and manage appointments against doctors and clinics.", clicks: ["Appointments"] },
      { label: "vitals", route: "/receptionist", caption: "Vitals capture", blurb: "Record vitals at intake so the doctor opens a complete encounter.", clicks: ["Vitals"] },
    ],
  },
  admin: {
    title: "Administration", user: "ADM001",
    subtitle: "Workforce, finance, pharmacy oversight and system control in one console",
    shots: [
      { label: "dashboard", route: "/admin", caption: "Operations dashboard", blurb: "Revenue, daily patients, active staff, low-stock and computed patient-growth at a glance." },
      { label: "inventory", route: "/admin/inventory", caption: "Inventory & procurement", blurb: "Stock health, low-stock alerts and expiry watchlist — record a new stock order in a modal.", prepare: openProcurement },
      { label: "staff", route: "/admin/staff", caption: "Staff directory", blurb: "Full workforce directory with profile drill-in, role-create and archive." },
      { label: "payroll", route: "/admin/payroll", caption: "Payroll runs", blurb: "Generate month-wise payroll, adjust lines, and finalize with an immutable lock." },
      { label: "audit", route: "/admin/audit", caption: "Security & system audit", blurb: "Real-time, filterable audit ledger of every administrative action with date and severity filters." },
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
    const context = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2 });
    try {
      const u = await resolveUser(s.user || def.user);
      await context.addCookies([{ name: "token", value: await mintToken(u), url: BASE, httpOnly: true, sameSite: "Lax" }]);
      const page = await context.newPage();
      // domcontentloaded (not networkidle — SSE/polling pages never idle) + settle
      await page.goto(`${BASE}${s.route}`, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
      await wait(page, 2600);
      if (s.clicks) for (const c of s.clicks) await clickByText(page, c, 1000);
      if (s.prepare) { try { await s.prepare(page); } catch { /* fallback to plain view */ } }
      await wait(page, 500);
      await page.screenshot({ path: `${dir}/${s.label}.png`, fullPage: false });
      manifestShots.push({ label: s.label, caption: s.caption, blurb: s.blurb, file: `${s.label}.png` });
      console.log(`  ✓ ${s.label.padEnd(14)} ${s.route}`);
    } catch (e) {
      console.log(`  ✗ ${s.label.padEnd(14)} ${s.route}  ERR ${e.message}`);
    } finally { await context.close(); }
  }
  writeFileSync(`${dir}/manifest.json`, JSON.stringify({ key, title: def.title, subtitle: def.subtitle, shots: manifestShots }, null, 2));
  console.log(`  → ${dir}/manifest.json (${manifestShots.length} shots)`);
}

async function main() {
  const which = (process.env.MODULE || "all").toLowerCase();
  const keys = which === "all" ? Object.keys(MODULES) : [which];
  const browser = await chromium.launch();
  console.log(`base=${BASE} viewport=${VW}x${VH}`);
  for (const k of keys) { if (!MODULES[k]) { console.log(`! unknown ${k}`); continue; } await captureModule(browser, k, MODULES[k]); }
  await browser.close();
  await pool.end();
  console.log("\ndone.");
}
main().catch((e) => { console.error(e); process.exit(1); });
