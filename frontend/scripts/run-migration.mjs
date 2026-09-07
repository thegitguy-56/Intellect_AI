// run-migration.mjs — applies migrations via the pg driver directly,
// bypassing Prisma's native engine (which has connectivity issues on some
// networks despite port 5432 being open, likely an IPv4/IPv6 mismatch).
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const rawSql = readFileSync(
  join(__dirname, "../prisma/migrations/20260825004219_init/migration.sql"),
  "utf8"
);

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
console.log("Connected to Neon.");

// "Already exists" error codes we can safely skip.
const SKIP_CODES = new Set([
  "42P07", // duplicate_table
  "42710", // duplicate_object (enum, etc.)
  "42701", // duplicate_column
  "42P16", // invalid_table_definition (e.g. constraint already exists)
  "23505", // unique_violation (index already exists in some pg versions)
  "42P11", // duplicate_index (some pg versions)
]);

// Split on statement boundaries (semicolons followed by newlines).
// Each statement in Prisma-generated SQL starts with a "-- CreateXxx" comment,
// so we strip leading comment lines before checking whether there's real SQL.
const statements = rawSql
  .split(/;\s*\n/)
  .map((s) => {
    // Remove leading comment lines (-- ...) to get to the actual SQL.
    const lines = s.trim().split("\n");
    const firstNonComment = lines.findIndex((l) => !l.trim().startsWith("--"));
    return firstNonComment === -1 ? "" : lines.slice(firstNonComment).join("\n").trim();
  })
  .filter((s) => s.length > 0);

let applied = 0;
let skipped = 0;
let failed = 0;

for (const stmt of statements) {
  try {
    await client.query(stmt + ";");
    applied++;
  } catch (err) {
    if (SKIP_CODES.has(err.code)) {
      skipped++;
    } else {
      console.error(`❌ Failed: ${stmt.slice(0, 80)}...\n   Error (${err.code}): ${err.message}`);
      failed++;
    }
  }
}

console.log(`\nResult: ${applied} applied, ${skipped} skipped (already existed), ${failed} failed.`);
if (failed > 0) {
  console.error("Some statements failed — check output above.");
  process.exit(1);
}

// Record it in _prisma_migrations so Prisma CLI tracks it.
await client.query(`
  CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    id                      VARCHAR(36)     NOT NULL PRIMARY KEY,
    checksum                VARCHAR(64)     NOT NULL,
    finished_at             TIMESTAMPTZ,
    migration_name          VARCHAR(255)    NOT NULL,
    logs                    TEXT,
    rolled_back_at          TIMESTAMPTZ,
    started_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    applied_steps_count     INTEGER         NOT NULL DEFAULT 0
  );
`);

const existing = await client.query(
  `SELECT id FROM "_prisma_migrations" WHERE migration_name = $1`,
  ["20260825004219_init"]
);
if (existing.rowCount === 0) {
  await client.query(
    `INSERT INTO "_prisma_migrations" (id, checksum, migration_name, finished_at, applied_steps_count)
     VALUES (gen_random_uuid()::text, 'manual', '20260825004219_init', now(), 1)`
  );
  console.log("✅ Migration recorded in _prisma_migrations.");
} else {
  console.log("ℹ️  Migration already recorded.");
}

await client.end();
console.log("Done.");
