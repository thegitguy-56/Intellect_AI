// run-migration-http.mjs — applies migrations via Neon's HTTP/WebSocket driver,
// which uses port 443 (not 5432) and avoids all TCP/IPv4/IPv6 connectivity issues.
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const rawSql = readFileSync(
  join(__dirname, "../prisma/migrations/20260825004219_init/migration.sql"),
  "utf8"
);

// Neon HTTP driver — uses HTTPS (port 443), not TCP port 5432.
// Use the pooled DATABASE_URL (works even when compute is idle).
const sql = neon(process.env.DATABASE_URL);
console.log("Using Neon HTTP driver (port 443)...");

// "Already exists" PG error codes we can safely skip.
const SKIP_CODES = new Set([
  "42P07", // duplicate_table
  "42710", // duplicate_object (enum, etc.)
  "42701", // duplicate_column
  "42P16", // invalid_table_definition
  "42P11", // duplicate_index
]);

// Split on statement boundaries; strip leading comment lines from each chunk.
const statements = rawSql
  .split(/;\s*\n/)
  .map((s) => {
    const lines = s.trim().split("\n");
    const firstNonComment = lines.findIndex((l) => !l.trim().startsWith("--"));
    return firstNonComment === -1 ? "" : lines.slice(firstNonComment).join("\n").trim();
  })
  .filter((s) => s.length > 0);

console.log(`Parsed ${statements.length} SQL statements.`);

let applied = 0;
let skipped = 0;
let failed = 0;

for (const stmt of statements) {
  try {
    await sql.query(stmt);
    applied++;
    console.log(`  ✅ ${stmt.slice(0, 60).replace(/\n/g, " ")}...`);
  } catch (err) {
    const code = err?.cause?.code ?? err?.code;
    if (SKIP_CODES.has(code)) {
      skipped++;
      console.log(`  ⏭  Already exists — ${stmt.slice(0, 60).replace(/\n/g, " ")}`);
    } else {
      console.error(`  ❌ Failed (${code}): ${stmt.slice(0, 80).replace(/\n/g, " ")}`);
      console.error(`     ${err.message}`);
      failed++;
    }
  }
}

console.log(`\nResult: ${applied} applied, ${skipped} skipped (already existed), ${failed} failed.`);
if (failed > 0) {
  console.error("Some statements failed — check output above.");
  process.exit(1);
}

// Record in _prisma_migrations so Prisma CLI tracks it.
try {
  await sql`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      id                      VARCHAR(36)     NOT NULL PRIMARY KEY,
      checksum                VARCHAR(64)     NOT NULL,
      finished_at             TIMESTAMPTZ,
      migration_name          VARCHAR(255)    NOT NULL,
      logs                    TEXT,
      rolled_back_at          TIMESTAMPTZ,
      started_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
      applied_steps_count     INTEGER         NOT NULL DEFAULT 0
    )
  `;
} catch { /* already exists */ }

const existing = await sql`
  SELECT id FROM "_prisma_migrations" WHERE migration_name = '20260825004219_init'
`;

if (existing.length === 0) {
  await sql`
    INSERT INTO "_prisma_migrations" (id, checksum, migration_name, finished_at, applied_steps_count)
    VALUES (gen_random_uuid()::text, 'manual', '20260825004219_init', now(), 1)
  `;
  console.log("✅ Migration recorded in _prisma_migrations.");
} else {
  console.log("ℹ️  Migration already recorded.");
}

console.log("Done.");
