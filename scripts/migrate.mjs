// Applies db/migrations/*.sql in order, once each, inside a transaction per file.
// Usage: DATABASE_URL=postgres://... pnpm db:migrate
import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(root, "db", "migrations");
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env and set it.");
  process.exit(1);
}

function psql(args, input) {
  const result = spawnSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-X", "-q", ...args], {
    input,
    encoding: "utf8",
  });
  if (result.error) {
    throw new Error(`Could not run psql: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `psql exited with status ${result.status}`);
  }
  return result.stdout;
}

psql([], "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now());");

const applied = new Map(
  psql(["-At", "-F", "\t", "-c", "SELECT name, sha256 FROM schema_migrations"])
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split("\t")),
);

const files = (await readdir(migrationsDir)).filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort();

for (const file of files) {
  const sql = await readFile(join(migrationsDir, file), "utf8");
  const sha = createHash("sha256").update(sql).digest("hex");
  const previous = applied.get(file);
  if (previous) {
    if (previous !== sha) {
      console.error(`Migration ${file} was changed after it was applied. Write a new migration instead.`);
      process.exit(1);
    }
    continue;
  }
  const name = file.replaceAll("'", "''");
  try {
    psql(["-1"], `${sql}\nINSERT INTO schema_migrations (name, sha256) VALUES ('${name}', '${sha}');`);
  } catch (error) {
    console.error(`Migration ${file} failed and was rolled back:\n${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
  console.log(`applied ${file}`);
}
console.log("migrations up to date");
