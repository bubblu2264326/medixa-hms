// One-shot Supabase backup via pg_dump.
// Reads DATABASE_URL from .env.local, extracts the password, constructs the
// Direct connection (db.<ref>.supabase.co:5432), and runs pg_dump.
//
// Usage:
//   node --env-file=.env.local scripts/dump-supabase.mjs [outfile]
//
// Default outfile: hms-<YYYYMMDD-HHMM>.dump  (PostgreSQL custom format)

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Run with --env-file=.env.local.");
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(url);
} catch (e) {
  console.error("Could not parse DATABASE_URL:", e.message);
  process.exit(1);
}

const password = decodeURIComponent(parsed.password);
if (!password) {
  console.error("No password found in DATABASE_URL.");
  process.exit(1);
}

// pg_dump needs the SESSION pooler (port 5432), not the TRANSACTION pooler (6543).
// If the URL is already a session pooler, use it as-is.
// If it's the transaction pooler, swap the port.
// If it's the (often unreachable) direct hostname, swap to the pooler.
const userPart = decodeURIComponent(parsed.username);
const dbName = parsed.pathname.replace(/^\//, "") || "postgres";

let dumpHost = parsed.hostname;
let dumpPort = parsed.port || "5432";
let dumpUser = userPart;

if (parsed.hostname.startsWith("db.") && parsed.hostname.endsWith(".supabase.co")) {
  // Direct hostname — IPv6-only on free tier. Rewrite to session pooler if we can guess region.
  console.error(
    "Direct hostname is set in DATABASE_URL, but it's typically IPv6-only on free tier.\n" +
    "Falling back: use the session pooler. If your DATABASE_URL in .env.local is the pooler\n" +
    "URL already, this script will use it as-is. Otherwise grab the Session Pooler URL from\n" +
    "Supabase Dashboard → Settings → Database → Connection string → Session pooler."
  );
  process.exit(2);
}

if (dumpPort === "6543") {
  console.log("→ Detected transaction pooler (port 6543); switching to session pooler port 5432");
  dumpPort = "5432";
}

// Resolve pg_dump path: absolute install locations first, then PATH.
const candidates = [
  "C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe",
  "C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe",
  "C:\\Program Files (x86)\\PostgreSQL\\18\\bin\\pg_dump.exe",
  "C:\\Program Files (x86)\\PostgreSQL\\17\\bin\\pg_dump.exe",
];

function pickBinary(candidates) {
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return "pg_dump"; // last-ditch PATH lookup
}

const pgDump = pickBinary(candidates);
console.log("→ pg_dump: ", pgDump);

const stamp = new Date()
  .toISOString()
  .replace(/[-:T]/g, "")
  .slice(0, 13); // YYYYMMDDHHMM
const outfile = process.argv[2] || `hms-${stamp}.dump`;
const outPath = path.resolve(process.cwd(), outfile);

console.log("→ host:    ", dumpHost);
console.log("→ port:    ", dumpPort);
console.log("→ user:    ", dumpUser);
console.log("→ database:", dbName);
console.log("→ output:  ", outPath);
console.log("→ format:  ", "custom (-Fc), no-owner, no-privileges");
console.log();

const args = [
  "--host", dumpHost,
  "--port", dumpPort,
  "--username", dumpUser,
  "--dbname", dbName,
  "--format=custom",
  "--no-owner",
  "--no-privileges",
  "--verbose",
  "--file", outPath,
];

const child = spawn(pgDump, args, {
  env: { ...process.env, PGPASSWORD: password },
  stdio: ["ignore", "inherit", "inherit"],
});

child.on("error", (err) => {
  console.error("Failed to start pg_dump:", err.message);
  process.exit(1);
});

child.on("exit", (code) => {
  if (code === 0) {
    console.log(`\n✅ Dump written: ${outPath}`);
  } else {
    console.error(`\n❌ pg_dump exited with code ${code}`);
    process.exit(code ?? 1);
  }
});
