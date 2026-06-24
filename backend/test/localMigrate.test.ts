import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  BASELINE_MIGRATION,
  isP3005Error,
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

test("deploy-database.mjs baselines P3005 with migrate resolve --applied", () => {
  const source = readFileSync(
    resolve(backendRoot, "scripts/deploy-database.mjs"),
    "utf8",
  );
  assert.match(source, /isP3005Error/);
  assert.match(source, /migrate", "resolve", "--applied", BASELINE_MIGRATION/);
  assert.doesNotMatch(source, /--rolled-back/);
});

test("dev script uses ensure-local-schema instead of raw migrate deploy", () => {
  const pkg = JSON.parse(readFileSync(resolve(backendRoot, "package.json"), "utf8"));
  assert.match(pkg.scripts.dev, /ensure-local-schema\.mjs/);
  assert.doesNotMatch(pkg.scripts.dev, /migrate deploy/);
});
