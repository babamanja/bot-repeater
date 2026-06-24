import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  BASELINE_MIGRATION,
  BASELINE_DRIFT_REPAIR_SQL,
  extractFailedMigrationName,
  isP3005Error,
  isP3018Error,
} from "../scripts/prismaMigrate.mjs";

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("isP3005Error detects non-empty database baseline error", () => {
  assert.equal(
    isP3005Error("Error: P3005\n\nThe database schema is not empty."),
    true,
  );
  assert.equal(isP3005Error("database schema is not empty"), true);
  assert.equal(isP3005Error("migration applied successfully"), false);
});

test("BASELINE_MIGRATION matches checked-in migration folder", () => {
  const migrationSql = resolve(
    backendRoot,
    "prisma/migrations",
    BASELINE_MIGRATION,
    "migration.sql",
  );
  assert.ok(existsSync(migrationSql), `expected ${migrationSql}`);
});

test("isP3018Error detects failed migration recovery error", () => {
  assert.equal(
    isP3018Error("Error: P3018\n\nA migration failed to apply."),
    true,
  );
  assert.equal(isP3018Error("migration failed to apply"), true);
  assert.equal(isP3018Error("migration applied successfully"), false);
});

test("extractFailedMigrationName parses Prisma migrate output", () => {
  const output = "Migration name: 20260622170000_user_dictionaries\nDatabase error code: 42703";
  assert.equal(extractFailedMigrationName(output), "20260622170000_user_dictionaries");
});

test("BASELINE_DRIFT_REPAIR_SQL adds users.created_at for legacy DBs", () => {
  assert.match(BASELINE_DRIFT_REPAIR_SQL.join("\n"), /users.*created_at/);
});

test("deploy-database.mjs baselines P3005 with migrate resolve --applied", () => {
  const source = readFileSync(
    resolve(backendRoot, "scripts/deploy-database.mjs"),
    "utf8",
  );
  assert.match(source, /isP3005Error/);
  assert.match(source, /migrate", "resolve", "--applied", BASELINE_MIGRATION/);
  assert.match(source, /isP3018Error/);
  assert.match(source, /repairBaselineDrift/);
  assert.doesNotMatch(source, /--rolled-back.*BASELINE_MIGRATION/);
});

test("dev script uses ensure-local-schema instead of raw migrate deploy", () => {
  const pkg = JSON.parse(readFileSync(resolve(backendRoot, "package.json"), "utf8"));
  assert.match(pkg.scripts.dev, /ensure-local-schema\.mjs/);
  assert.doesNotMatch(pkg.scripts.dev, /migrate deploy/);
});
