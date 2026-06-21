// Pitch PDF builder — turns pitch/shots/<module>/manifest.json + PNGs into a
// dense, designed one-PDF-per-module brochure via Playwright's page.pdf().
// Images are embedded as base64 so the PDF is self-contained.
//
// Run:  MODULE=pharmacy node scripts/pitch/build-pdf.mjs
//       MODULE=all      node scripts/pitch/build-pdf.mjs

import { chromium } from "playwright";
import { readFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";

const SHOTS = "pitch/shots";
const OUT = "pitch";

function dataUri(path) {
  return "data:image/png;base64," + readFileSync(path).toString("base64");
}

function esc(s) {
  return String(s).replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));
}

function renderHtml(m) {
  const features = m.shots
    .map(
      (s, i) => `
      <section class="feature">
        <div class="shot"><img src="${dataUri(`${SHOTS}/${m.key}/${s.file}`)}" alt="${esc(s.caption)}"/></div>
        <div class="cap">
          <span class="num">${String(i + 1).padStart(2, "0")}</span>
          <div><h3>${esc(s.caption)}</h3><p>${esc(s.blurb)}</p></div>
        </div>
      </section>`
    )
    .join("");

  const chips = m.shots.map((s) => `<span>${esc(s.caption)}</span>`).join("");

  return `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  :root { --ink:#0f172a; --sub:#475569; --teal:#0d9488; --teal-d:#0f766e; --line:#e2e8f0; --bg:#f8fafc; }
  @page { size: A4; margin: 0; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: var(--ink); }

  /* ---- Cover ---- */
  .cover { height: 297mm; padding: 22mm 18mm; display: flex; flex-direction: column;
           background: linear-gradient(150deg,#0f766e 0%,#0f172a 100%); color: #fff; }
  .cover .brand { font-size: 12pt; font-weight: 700; letter-spacing: .28em; text-transform: uppercase; opacity: .85; }
  .cover .brand small { display:block; font-weight:500; letter-spacing:.12em; opacity:.7; font-size:8pt; margin-top:2px;}
  .cover .spacer { flex: 1; }
  .cover h1 { font-size: 40pt; line-height: 1.04; font-weight: 800; letter-spacing: -0.5pt; }
  .cover .sub { font-size: 14pt; font-weight: 400; opacity: .9; margin-top: 10px; max-width: 150mm; line-height: 1.4; }
  .cover .chips { margin-top: 20px; display: flex; flex-wrap: wrap; gap: 7px; }
  .cover .chips span { font-size: 8.5pt; font-weight: 600; padding: 5px 11px; border-radius: 20px;
                       background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.25); }
  .cover .foot { margin-top: 22px; font-size: 9pt; opacity: .7; border-top: 1px solid rgba(255,255,255,.2); padding-top: 12px; }

  /* ---- Content ---- */
  .pages { padding: 0 14mm 12mm; }
  .hdr { display: flex; justify-content: space-between; align-items: center;
         padding: 9mm 0 4mm; border-bottom: 2px solid var(--teal); margin-bottom: 6mm; }
  .hdr .mod { font-size: 11pt; font-weight: 700; color: var(--teal-d); }
  .hdr .wm { font-size: 9pt; font-weight: 700; letter-spacing: .2em; color: var(--sub); }

  .feature { break-inside: avoid; margin-bottom: 7mm; }
  .shot { border: 1px solid var(--line); border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(15,23,42,.10); }
  .shot img { display: block; width: 100%; }
  .cap { display: flex; gap: 11px; margin-top: 7px; align-items: flex-start; }
  .cap .num { font-size: 13pt; font-weight: 800; color: var(--teal); line-height: 1; min-width: 26px; }
  .cap h3 { font-size: 12pt; font-weight: 700; }
  .cap p { font-size: 9.5pt; color: var(--sub); line-height: 1.45; margin-top: 2px; }
  </style></head><body>
    <div class="cover">
      <div class="brand">HMS<small>Hospital Management System</small></div>
      <div class="spacer"></div>
      <h1>${esc(m.title)}</h1>
      <div class="sub">${esc(m.subtitle)}</div>
      <div class="chips">${chips}</div>
      <div class="foot">A guided walkthrough of the live system — every screen below is the working product.</div>
    </div>
    <div class="pages">
      <div class="hdr"><span class="mod">${esc(m.title)}</span><span class="wm">HMS</span></div>
      ${features}
    </div>
  </body></html>`;
}

async function build(browser, key) {
  const manifestPath = `${SHOTS}/${key}/manifest.json`;
  if (!existsSync(manifestPath)) { console.log(`! no manifest for ${key}`); return; }
  const m = JSON.parse(readFileSync(manifestPath, "utf8"));
  const html = renderHtml(m);
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle" });
  mkdirSync(OUT, { recursive: true });
  const out = `${OUT}/HMS-${key}.pdf`;
  await page.pdf({ path: out, format: "A4", printBackground: true, preferCSSPageSize: true });
  if (process.env.PREVIEW === "1") {
    await page.setViewportSize({ width: 794, height: 1123 });
    await page.screenshot({ path: `${OUT}/preview-${key}.png`, fullPage: true });
    console.log(`  ✓ ${OUT}/preview-${key}.png`);
  }
  await page.close();
  console.log(`  ✓ ${out}`);
}

async function main() {
  const which = (process.env.MODULE || "pharmacy").toLowerCase();
  const keys = which === "all"
    ? readdirSync(SHOTS).filter((d) => existsSync(`${SHOTS}/${d}/manifest.json`))
    : [which];
  const browser = await chromium.launch();
  for (const k of keys) await build(browser, k);
  await browser.close();
  console.log("done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
