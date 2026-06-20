// One-shot Supabase introspection.
// Dumps schema, constraints, indexes, triggers, functions, views, row counts,
// and a few sample rows per table into database/snapshot/*.md
//
// Usage: node --env-file=.env.local scripts/introspect-db.mjs

import pg from "pg";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const isLocal = /@(localhost|127\.0\.0\.1)\b/.test(process.env.DATABASE_URL);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

const OUT_DIR = path.join(process.cwd(), "database", "snapshot");
await mkdir(OUT_DIR, { recursive: true });

function md(rows) {
  if (!rows.length) return "_(none)_\n";
  const cols = Object.keys(rows[0]);
  const header = "| " + cols.join(" | ") + " |";
  const sep = "| " + cols.map(() => "---").join(" | ") + " |";
  const body = rows
    .map(
      (r) =>
        "| " +
        cols
          .map((c) => {
            const v = r[c];
            if (v === null || v === undefined) return "";
            if (typeof v === "object") return JSON.stringify(v).replace(/\|/g, "\\|");
            return String(v).replace(/\|/g, "\\|").replace(/\n/g, " ");
          })
          .join(" | ") +
        " |"
    )
    .join("\n");
  return `${header}\n${sep}\n${body}\n`;
}

async function q(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows;
}

console.log("→ tables");
const tables = await q(`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  ORDER BY table_name;
`);

console.log("→ columns");
const columns = await q(`
  SELECT table_name, column_name, data_type, udt_name,
         is_nullable, column_default, character_maximum_length
  FROM information_schema.columns
  WHERE table_schema = 'public'
  ORDER BY table_name, ordinal_position;
`);

console.log("→ primary keys");
const pks = await q(`
  SELECT tc.table_name, kcu.column_name, tc.constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema = kcu.table_schema
  WHERE tc.table_schema = 'public' AND tc.constraint_type = 'PRIMARY KEY'
  ORDER BY tc.table_name, kcu.ordinal_position;
`);

console.log("→ foreign keys");
const fks = await q(`
  SELECT tc.table_name, kcu.column_name,
         ccu.table_name AS ref_table, ccu.column_name AS ref_column,
         rc.update_rule, rc.delete_rule, tc.constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = rc.unique_constraint_name
  WHERE tc.table_schema = 'public' AND tc.constraint_type = 'FOREIGN KEY'
  ORDER BY tc.table_name, kcu.column_name;
`);

console.log("→ unique constraints");
const uniques = await q(`
  SELECT tc.table_name, kcu.column_name, tc.constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  WHERE tc.table_schema = 'public' AND tc.constraint_type = 'UNIQUE'
  ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position;
`);

console.log("→ check constraints");
const checks = await q(`
  SELECT tc.table_name, tc.constraint_name, cc.check_clause
  FROM information_schema.table_constraints tc
  JOIN information_schema.check_constraints cc
    ON tc.constraint_name = cc.constraint_name
  WHERE tc.table_schema = 'public' AND tc.constraint_type = 'CHECK'
  ORDER BY tc.table_name, tc.constraint_name;
`);

console.log("→ indexes");
const indexes = await q(`
  SELECT schemaname AS schema, tablename AS table_name, indexname AS index_name, indexdef
  FROM pg_indexes
  WHERE schemaname = 'public'
  ORDER BY tablename, indexname;
`);

console.log("→ views");
const views = await q(`
  SELECT table_name, view_definition
  FROM information_schema.views
  WHERE table_schema = 'public'
  ORDER BY table_name;
`);

console.log("→ functions & procedures");
const routines = await q(`
  SELECT p.proname AS name,
         pg_get_function_identity_arguments(p.oid) AS args,
         CASE p.prokind WHEN 'f' THEN 'function' WHEN 'p' THEN 'procedure' ELSE p.prokind::text END AS kind,
         l.lanname AS language,
         pg_get_functiondef(p.oid) AS definition
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  JOIN pg_language l ON l.oid = p.prolang
  WHERE n.nspname = 'public'
  ORDER BY p.proname, args;
`);

console.log("→ triggers");
const triggers = await q(`
  SELECT event_object_table AS table_name, trigger_name, action_timing, event_manipulation,
         action_orientation, action_statement
  FROM information_schema.triggers
  WHERE trigger_schema = 'public'
  ORDER BY event_object_table, trigger_name, event_manipulation;
`);

console.log("→ enums");
const enums = await q(`
  SELECT t.typname AS name, string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS values
  FROM pg_type t
  JOIN pg_enum e ON e.enumtypid = t.oid
  JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE n.nspname = 'public'
  GROUP BY t.typname
  ORDER BY t.typname;
`);

console.log("→ row counts");
const rowCounts = [];
for (const t of tables) {
  try {
    const r = await q(`SELECT COUNT(*)::int AS n FROM public."${t.table_name}"`);
    rowCounts.push({ table_name: t.table_name, n: r[0].n });
  } catch (e) {
    rowCounts.push({ table_name: t.table_name, n: "ERR: " + e.message });
  }
}

console.log("→ samples (3 rows per table, skipping empty)");
const samples = {};
for (const t of tables) {
  const tn = t.table_name;
  const rc = rowCounts.find((r) => r.table_name === tn)?.n;
  if (rc === 0 || typeof rc !== "number") continue;
  try {
    const r = await q(`SELECT * FROM public."${tn}" LIMIT 3`);
    samples[tn] = r;
  } catch (e) {
    samples[tn] = [{ ERR: e.message }];
  }
}

// ---------- write outputs ----------

const overview = [
  "# DB Snapshot — overview",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  `- Tables: ${tables.length}`,
  `- Views: ${views.length}`,
  `- Functions/Procedures: ${routines.length}`,
  `- Triggers: ${triggers.length}`,
  `- Enums: ${enums.length}`,
  "",
  "## Row counts",
  "",
  md(rowCounts),
  "",
  "## Files",
  "",
  "- [tables.md](./tables.md) — columns, PKs, FKs, uniques, checks",
  "- [indexes.md](./indexes.md)",
  "- [views.md](./views.md)",
  "- [routines.md](./routines.md) — functions & procedures with full bodies",
  "- [triggers.md](./triggers.md)",
  "- [enums.md](./enums.md)",
  "- [samples.md](./samples.md) — 3 rows per non-empty table",
  "",
].join("\n");
await writeFile(path.join(OUT_DIR, "overview.md"), overview);

// tables.md — per-table block
const colByTable = new Map();
for (const c of columns) {
  if (!colByTable.has(c.table_name)) colByTable.set(c.table_name, []);
  colByTable.get(c.table_name).push(c);
}
const pkByTable = new Map();
for (const p of pks) {
  if (!pkByTable.has(p.table_name)) pkByTable.set(p.table_name, []);
  pkByTable.get(p.table_name).push(p);
}
const fkByTable = new Map();
for (const f of fks) {
  if (!fkByTable.has(f.table_name)) fkByTable.set(f.table_name, []);
  fkByTable.get(f.table_name).push(f);
}
const uqByTable = new Map();
for (const u of uniques) {
  if (!uqByTable.has(u.table_name)) uqByTable.set(u.table_name, []);
  uqByTable.get(u.table_name).push(u);
}
const ckByTable = new Map();
for (const c of checks) {
  if (!ckByTable.has(c.table_name)) ckByTable.set(c.table_name, []);
  ckByTable.get(c.table_name).push(c);
}

const tablesParts = ["# Tables\n"];
for (const t of tables) {
  const tn = t.table_name;
  tablesParts.push(`## ${tn}\n`);
  tablesParts.push("### Columns\n");
  tablesParts.push(md(colByTable.get(tn) || []));
  tablesParts.push("\n### Primary key\n");
  tablesParts.push(md(pkByTable.get(tn) || []));
  tablesParts.push("\n### Foreign keys\n");
  tablesParts.push(md(fkByTable.get(tn) || []));
  tablesParts.push("\n### Unique constraints\n");
  tablesParts.push(md(uqByTable.get(tn) || []));
  tablesParts.push("\n### Check constraints\n");
  tablesParts.push(md(ckByTable.get(tn) || []));
  tablesParts.push("\n");
}
await writeFile(path.join(OUT_DIR, "tables.md"), tablesParts.join("\n"));

await writeFile(
  path.join(OUT_DIR, "indexes.md"),
  "# Indexes\n\n" + md(indexes)
);

const viewParts = ["# Views\n"];
for (const v of views) {
  viewParts.push(`## ${v.table_name}\n\n\`\`\`sql\n${v.view_definition}\n\`\`\`\n`);
}
await writeFile(path.join(OUT_DIR, "views.md"), viewParts.join("\n"));

const routineParts = ["# Functions & Procedures\n"];
for (const r of routines) {
  routineParts.push(`## ${r.name}(${r.args})  — ${r.kind} [${r.language}]\n\n\`\`\`sql\n${r.definition}\n\`\`\`\n`);
}
await writeFile(path.join(OUT_DIR, "routines.md"), routineParts.join("\n"));

await writeFile(
  path.join(OUT_DIR, "triggers.md"),
  "# Triggers\n\n" + md(triggers)
);

await writeFile(
  path.join(OUT_DIR, "enums.md"),
  "# Enums\n\n" + md(enums)
);

const sampleParts = ["# Samples (3 rows per non-empty table)\n"];
for (const [tn, rows] of Object.entries(samples)) {
  sampleParts.push(`## ${tn}\n`);
  sampleParts.push(md(rows));
  sampleParts.push("\n");
}
await writeFile(path.join(OUT_DIR, "samples.md"), sampleParts.join("\n"));

console.log("\n✅ snapshot written to database/snapshot/");
await pool.end();
