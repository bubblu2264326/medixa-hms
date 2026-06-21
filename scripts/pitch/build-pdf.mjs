// Pitch PDF builder — one detailed PDF per module via Playwright page.pdf().
// If pitch/content/<module>.json exists, renders the RICH landscape layout
// (cover -> overview -> one feature/page with big screenshot + description +
// capability bullets + impact -> closing). Otherwise falls back to the compact
// portrait layout from the manifest blurbs. Images embed as base64 (self-contained).
//
// Run:  MODULE=pharmacy node scripts/pitch/build-pdf.mjs
//       PREVIEW=1 MODULE=pharmacy node scripts/pitch/build-pdf.mjs   (also writes preview PNG)

import { chromium } from "playwright";
import { readFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";

const SHOTS = "pitch/shots";
const CONTENT = "pitch/content";
const OUT = "pitch";
const dataUri = (p) => "data:image/png;base64," + readFileSync(p).toString("base64");
const esc = (s) => String(s).replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));

const CSS = `
* { margin:0; padding:0; box-sizing:border-box; }
:root { --ink:#0f172a; --sub:#475569; --teal:#0d9488; --teal-d:#0f766e; --line:#e2e8f0; --bg:#f8fafc; }
@page { size: A4 landscape; margin: 0; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; color:var(--ink); }
.page { width:297mm; height:209.8mm; overflow:hidden; page-break-after:always; position:relative; }

/* Cover */
.cover { background:linear-gradient(135deg,#0f766e 0%,#0f172a 100%); color:#fff; padding:24mm 26mm; display:flex; flex-direction:column; }
.cover .brand { font-size:12pt; font-weight:800; letter-spacing:.30em; }
.cover .brand small { display:block; font-weight:500; letter-spacing:.16em; opacity:.7; font-size:8pt; margin-top:3px; }
.cover .mid { flex:1; display:flex; flex-direction:column; justify-content:center; }
.cover h1 { font-size:46pt; line-height:1.03; font-weight:800; letter-spacing:-1pt; max-width:200mm; }
.cover .sub { font-size:15pt; opacity:.92; margin-top:14px; max-width:190mm; line-height:1.45; }
.cover .chips { margin-top:20px; display:flex; flex-wrap:wrap; gap:8px; max-width:230mm; }
.cover .chips span { font-size:9pt; font-weight:600; padding:6px 12px; border-radius:20px; background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.25); }
.cover .foot { font-size:9.5pt; opacity:.75; border-top:1px solid rgba(255,255,255,.25); padding-top:12px; }

/* Generic content header/footer */
.hd { display:flex; justify-content:space-between; align-items:center; padding:9mm 14mm 4mm; border-bottom:2px solid var(--teal); }
.hd .mod { font-size:11pt; font-weight:800; color:var(--teal-d); }
.hd .wm { font-size:9pt; font-weight:700; letter-spacing:.22em; color:var(--sub); }
.ft { position:absolute; bottom:7mm; left:14mm; right:14mm; display:flex; justify-content:space-between; font-size:8pt; color:#94a3b8; font-weight:600; }

/* Overview */
.ov { padding:7mm 14mm; display:flex; gap:12mm; height:165mm; }
.ov .lead { flex:1.1; }
.ov .lead .k { font-size:10pt; font-weight:800; color:var(--teal-d); text-transform:uppercase; letter-spacing:.14em; }
.ov .lead p { font-size:12.5pt; line-height:1.6; color:var(--ink); margin-top:10px; }
.ov .hl { flex:1; background:var(--bg); border:1px solid var(--line); border-radius:10px; padding:9mm; }
.ov .hl .k { font-size:9pt; font-weight:800; color:var(--sub); text-transform:uppercase; letter-spacing:.14em; margin-bottom:8px; }
.ov .hl ul { list-style:none; }
.ov .hl li { font-size:10pt; line-height:1.45; padding:5px 0 5px 20px; position:relative; border-bottom:1px solid var(--line); }
.ov .hl li:last-child { border-bottom:none; }
.ov .hl li::before { content:"✓"; position:absolute; left:0; color:var(--teal); font-weight:800; }

/* Feature — screenshot on top (near full width), filled text band below */
.feat { display:flex; flex-direction:column; height:172mm; padding:5mm 0 0; }
.feat .shotwrap { text-align:center; }
.feat .shot { display:inline-block; width:77%; border:1px solid var(--line); border-radius:9px; overflow:hidden; box-shadow:0 3px 10px rgba(15,23,42,.13); }
.feat .shot img { display:block; width:100%; }
.feat .txt { padding:6mm 16mm 0; flex:1; }
.feat .desc { font-size:10.5pt; line-height:1.5; color:var(--sub); }
.feat .caps { columns:2; column-gap:13mm; margin-top:9px; list-style:none; }
.feat .caps li { font-size:10pt; line-height:1.35; padding:4px 0 4px 18px; position:relative; break-inside:avoid; color:var(--ink); }
.feat .caps li::before { content:"▪"; position:absolute; left:2px; color:var(--teal); font-weight:800; }
.feat .imp { margin-top:10px; background:#ecfdf5; border-left:3px solid var(--teal); border-radius:0 8px 8px 0; padding:9px 13px; font-size:9.5pt; font-weight:600; color:var(--teal-d); line-height:1.4; }
.hd .mod .fno { color:var(--teal); }

/* Closing */
.close { background:linear-gradient(135deg,#0f172a 0%,#0f766e 100%); color:#fff; height:209.8mm; padding:30mm 26mm; display:flex; flex-direction:column; justify-content:center; }
.close h2 { font-size:30pt; font-weight:800; max-width:200mm; line-height:1.12; }
.close ul { list-style:none; margin-top:22px; max-width:215mm; }
.close li { font-size:12.5pt; line-height:1.5; padding:9px 0 9px 26px; position:relative; border-top:1px solid rgba(255,255,255,.18); }
.close li::before { content:"▸"; position:absolute; left:0; color:#5eead4; font-weight:800; }
.close .end { margin-top:26px; font-size:10pt; opacity:.7; letter-spacing:.04em; }
`;

function richHtml(m, manifest, content) {
  const byLabel = Object.fromEntries(manifest.shots.map((s) => [s.label, s]));
  const order = manifest.shots.map((s) => s.label).filter((l) => content.features[l]);
  const total = 2 + order.length + 1; // cover + overview + features + closing
  let pn = 1;
  const ft = (label) => `<div class="ft"><span>HMS · ${esc(content.title)}</span><span>${esc(label)} · ${pn} / ${total}</span></div>`;

  const cover = `<div class="page cover">
    <div class="brand">HMS<small>Hospital Management System</small></div>
    <div class="mid"><h1>${esc(content.title)}</h1><div class="sub">${esc(content.subtitle)}</div>
      <div class="chips">${content.overview.highlights.slice(0, 6).map((h) => `<span>${esc(h)}</span>`).join("")}</div>
    </div>
    <div class="foot">A guided walkthrough of the live system — every screen in this document is the working product on realistic demo data.</div>
  </div>`;

  pn = 2;
  const overview = `<div class="page">
    <div class="hd"><span class="mod">${esc(content.title)}</span><span class="wm">OVERVIEW</span></div>
    <div class="ov">
      <div class="lead"><div class="k">What this module does</div><p>${esc(content.overview.lead)}</p></div>
      <div class="hl"><div class="k">At a glance</div><ul>${content.overview.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul></div>
    </div>${ft("Overview")}</div>`;

  const features = order.map((label, i) => {
    pn = 3 + i;
    const f = content.features[label];
    const shot = byLabel[label];
    return `<div class="page">
      <div class="hd"><span class="mod"><span class="fno">Feature ${String(i + 1).padStart(2, "0")}</span> &nbsp;·&nbsp; ${esc(f.title)}</span><span class="wm">HMS &nbsp;·&nbsp; ${pn} / ${total}</span></div>
      <div class="feat">
        <div class="shotwrap"><div class="shot"><img src="${dataUri(`${SHOTS}/${m}/${shot.file}`)}"/></div></div>
        <div class="txt">
          <div class="desc">${esc(f.description)}</div>
          <ul class="caps">${f.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
          <div class="imp">${esc(f.impact)}</div>
        </div>
      </div></div>`;
  }).join("");

  pn = total;
  const closing = `<div class="page close">
    <h2>${esc(content.closing.lead)}</h2>
    <ul>${content.closing.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
    <div class="end">HMS · Hospital Management System</div>
  </div>`;

  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${cover}${overview}${features}${closing}</body></html>`;
}

// compact fallback (no content file) — portrait, manifest blurbs
function compactHtml(m) {
  const features = m.shots.map((s, i) => `<section class="feature"><div class="shot"><img src="${dataUri(`${SHOTS}/${m.key}/${s.file}`)}"/></div><div class="cap"><span class="num">${String(i + 1).padStart(2, "0")}</span><div><h3>${esc(s.caption)}</h3><p>${esc(s.blurb)}</p></div></div></section>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:0}*{margin:0;box-sizing:border-box}body{font-family:"Segoe UI",Arial,sans-serif;color:#0f172a}.pages{padding:10mm 14mm}.feature{break-inside:avoid;margin-bottom:7mm}.shot{border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}.shot img{width:100%;display:block}.cap{display:flex;gap:11px;margin-top:7px}.cap .num{font-size:13pt;font-weight:800;color:#0d9488}.cap h3{font-size:12pt}.cap p{font-size:9.5pt;color:#475569}</style></head><body><div class="pages">${features}</div></body></html>`;
}

async function build(browser, key) {
  const manifestPath = `${SHOTS}/${key}/manifest.json`;
  if (!existsSync(manifestPath)) { console.log(`! no manifest for ${key}`); return; }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const contentPath = `${CONTENT}/${key}.json`;
  const rich = existsSync(contentPath);
  const html = rich ? richHtml(key, manifest, JSON.parse(readFileSync(contentPath, "utf8"))) : compactHtml(manifest);
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle" });
  mkdirSync(OUT, { recursive: true });
  const out = `${OUT}/HMS-${key}.pdf`;
  await page.pdf({ path: out, printBackground: true, preferCSSPageSize: true });
  if (process.env.PREVIEW === "1") {
    await page.setViewportSize(rich ? { width: 1123, height: 794 } : { width: 794, height: 1123 });
    await page.screenshot({ path: `${OUT}/preview-${key}.png`, fullPage: true });
    console.log(`  ✓ ${OUT}/preview-${key}.png`);
  }
  if (process.env.QA) {
    await page.setViewportSize({ width: 1123, height: 794 });
    const n = Number(process.env.QA);
    await page.locator(`.page`).nth(n - 1).screenshot({ path: `${OUT}/qa-${key}.png` }).catch(() => {});
    console.log(`  ✓ ${OUT}/qa-${key}.png (page ${n})`);
  }
  await page.close();
  console.log(`  ✓ ${out}${rich ? " (rich)" : ""}`);
}

async function main() {
  const which = (process.env.MODULE || "pharmacy").toLowerCase();
  const keys = which === "all" ? readdirSync(SHOTS).filter((d) => existsSync(`${SHOTS}/${d}/manifest.json`)) : [which];
  const browser = await chromium.launch();
  for (const k of keys) await build(browser, k);
  await browser.close();
  console.log("done.");
}
main().catch((e) => { console.error(e); process.exit(1); });
