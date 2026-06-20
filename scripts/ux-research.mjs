// UX research harness: measure real, professional UIs to ground our density spec.
// Visits reference sites, extracts computed type scale / control heights / radius
// via getComputedStyle, and screenshots each. Read-only research, no app deps.
//
// Run: node scripts/ux-research.mjs
// Output: ux-shots/ref-<name>.png  +  prints a JSON metrics report.

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = "ux-shots";
const ALL_SITES = [
  { name: "shadcn-ui", url: "https://ui.shadcn.com/" },
  { name: "shadcn-dashboard", url: "https://ui.shadcn.com/examples/dashboard" },
  { name: "tailwind", url: "https://tailwindcss.com/" },
  { name: "linear", url: "https://linear.app/" },
  { name: "retool", url: "https://retool.com/" },
  { name: "stripe", url: "https://stripe.com/" },
  { name: "github", url: "https://github.com/" },
  { name: "square", url: "https://squareup.com/us/en/point-of-sale" },
  // healthcare-first references (public/marketing — clinician product is login-gated)
  { name: "doctolib", url: "https://www.doctolib.fr/" },
  { name: "practo", url: "https://www.practo.com/" },
  { name: "drchrono", url: "https://www.drchrono.com/" },
];
// UX_ONLY=doctolib,practo,drchrono  -> run just those
const only = (process.env.UX_ONLY || "").split(",").map((s) => s.trim()).filter(Boolean);
const SITES = only.length ? ALL_SITES.filter((s) => only.includes(s.name)) : ALL_SITES;

const MEASURE = () => {
  const round = (v) => Math.round(parseFloat(v));
  const visible = (e) => e.offsetParent !== null && e.getClientRects().length > 0;
  const freq = (arr) => {
    const m = {};
    arr.forEach((x) => { if (x != null && !isNaN(x)) m[x] = (m[x] || 0) + 1; });
    return Object.entries(m).map(([k, v]) => [Number(k), v]).sort((a, b) => b[1] - a[1]).slice(0, 8);
  };
  const sample = (sel, fn) =>
    Array.from(document.querySelectorAll(sel)).filter(visible).slice(0, 500).map(fn).filter((x) => x != null);

  const r = {};
  r.rootFontSize = getComputedStyle(document.documentElement).fontSize;
  r.bodyFontFamily = getComputedStyle(document.body).fontFamily.split(",")[0].replace(/"/g, "");
  r.buttonHeights = freq(sample("button, a[role=button]", (b) => round(getComputedStyle(b).height)));
  r.buttonRadius = freq(sample("button, a[role=button]", (b) => round(getComputedStyle(b).borderTopLeftRadius)));
  r.buttonFontSizes = freq(sample("button, a[role=button]", (b) => round(getComputedStyle(b).fontSize)));
  r.inputHeights = freq(sample("input, select, textarea", (b) => round(getComputedStyle(b).height)));
  r.fontSizes = freq(sample("p,span,a,li,td,th,h1,h2,h3,h4,h5,label,button", (t) =>
    t.textContent.trim().length > 0 ? round(getComputedStyle(t).fontSize) : null));
  r.radii = freq(sample("div,button,a,section,article,input", (e) => round(getComputedStyle(e).borderTopLeftRadius)));
  const hx = (sel) => {
    const e = Array.from(document.querySelectorAll(sel)).find(visible);
    if (!e) return null;
    const c = getComputedStyle(e);
    return { fs: round(c.fontSize), lh: c.lineHeight, fw: c.fontWeight };
  };
  r.h1 = hx("h1"); r.h2 = hx("h2"); r.h3 = hx("h3"); r.p = hx("p");

  // palette: most common non-transparent button backgrounds + link colors
  const isColor = (c) => c && c !== "rgba(0, 0, 0, 0)" && c !== "transparent" && !/rgba\(0, 0, 0, 0\)/.test(c);
  const strFreq = (arr) => {
    const m = {};
    arr.forEach((x) => { if (isColor(x)) m[x] = (m[x] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6);
  };
  r.buttonBg = strFreq(sample("button, a[role=button], .btn, a[class*=button]", (b) => getComputedStyle(b).backgroundColor));
  r.linkColors = strFreq(sample("a", (a) => getComputedStyle(a).color));
  return r;
};

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const report = {};
  for (const s of SITES) {
    const ctx = await browser.newContext({
      viewport: { width: 1536, height: 900 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    });
    const page = await ctx.newPage();
    try {
      await page.goto(s.url, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(2500);
      await page.screenshot({ path: `${OUT}/ref-${s.name}.png` });
      report[s.name] = await page.evaluate(MEASURE);
      console.log(`  ✓ ${s.name}`);
    } catch (e) {
      report[s.name] = { error: e.message };
      console.log(`  ✗ ${s.name}: ${e.message}`);
    } finally {
      await ctx.close();
    }
  }
  await browser.close();
  console.log("\n===METRICS_JSON===");
  console.log(JSON.stringify(report, null, 2));
}
main().catch((e) => { console.error(e); process.exit(1); });
