/**
 * Applies pending Prisma migrations (migrate deploy).
 * - Vercel Production: migrate deploy (uses direct DB URL on Neon when set).
 * - Vercel Preview / Development: skipped.
 * - Local: runs when DATABASE_URL (or DB_* parts) is set; otherwise skipped.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  BASELINE_DRIFT_REPAIR_SQL,
  BASELINE_MIGRATION,
  extractFailedMigrationName,
  isP3005Error,
  isP3018Error,
  runPrisma,
} from "./prismaMigrate.mjs";

const backendDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const isVercel = process.env.VERCEL === "1";
const vercelEnv = process.env.VERCEL_ENV?.trim().toLowerCase() ?? "";

async function loadLocalEnvFiles() {
  if (isVercel) {
    return;
  }
  const { loadEnv } = await import("./loadEnv.mjs");
  loadEnv();
}

function pickFirstEnv(...keys) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) {
      return { key, value };
    }
  }
  return null;
}

function safeHost(databaseUrl) {
  try {
    return new URL(databaseUrl).hostname;
  } catch {
    return "";
  }
}

function refuseLocalhostOnVercel(key, databaseUrl) {
  const host = safeHost(databaseUrl);
  if (host === "localhost" || host === "127.0.0.1") {
    console.error(
      `[db:deploy] Refusing ${key} pointing at ${host} on Vercel. ` +
        "Use your cloud Postgres URL (Neon / Vercel Postgres), not localhost.",
    );
    process.exit(1);
  }
}

function resolveDatabaseUrl() {
  if (isVercel) {
    const picked = pickFirstEnv(
      "POSTGRES_URL_NON_POOLING",
      "DATABASE_URL_UNPOOLED",
      "DIRECT_URL",
      "DATABASE_URL",
      "POSTGRES_PRISMA_URL",
      "POSTGRES_URL",
    );
    if (!picked) {
      return null;
    }
    if (
      picked.key === "DATABASE_URL" ||
      picked.key === "POSTGRES_PRISMA_URL" ||
      picked.key === "POSTGRES_URL"
    ) {
      console.warn(
        `[db:deploy] Using ${picked.key} for migrations. ` +
          "Prefer POSTGRES_URL_NON_POOLING on Neon to avoid pooler issues.",
      );
    }
    refuseLocalhostOnVercel(picked.key, picked.value);
    return picked.value;
  }

  const explicit = process.env.DATABASE_URL?.trim();
  if (explicit) {
    return explicit;
  }

  const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_DATABASE } = process.env;
  if (DB_USER && DB_HOST && DB_PORT && DB_DATABASE) {
    return `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_DATABASE}`;
  }
  return null;
}

function logDatabaseTarget(databaseUrl) {
  try {
    const parsed = new URL(databaseUrl);
    const db = parsed.pathname.replace(/^\//, "") || "postgres";
    const pooler = parsed.hostname.includes("-pooler") ? " (pooler)" : "";
    console.log(
      `[db:deploy] Target: ${parsed.hostname}:${parsed.port || "5432"}/${db}${pooler}`,
    );
  } catch {
    console.log("[db:deploy] Target: (could not parse DATABASE_URL host)");
  }
}

function runMigrateDeploy(capture = false) {
  return runPrisma(["migrate", "deploy"], { capture });
}

function baselineExistingDatabase() {
  console.warn(
    `[db:deploy] Database has tables but no Prisma migration history (P3005). ` +
      `Marking ${BASELINE_MIGRATION} as applied…`,
  );
  return runPrisma(["migrate", "resolve", "--applied", BASELINE_MIGRATION]);
}

async function repairBaselineDrift() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    for (const sql of BASELINE_DRIFT_REPAIR_SQL) {
      await prisma.$executeRawUnsafe(sql);
    }
    console.log("[db:deploy] Repaired baseline schema drift.");
  } finally {
    await prisma.$disconnect();
  }
}

function resolveFailedMigration(migrationName) {
  console.warn(
    `[db:deploy] Migration ${migrationName} failed previously (P3018). ` +
      "Marking as rolled back and retrying…",
  );
  return runPrisma(["migrate", "resolve", "--rolled-back", migrationName]);
}

function exitMigrateFailure(result) {
  if (result.output.trim()) {
    process.stderr.write(result.output);
  }
  process.exit(result.status);
}

async function verifyCoreTables() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1 FROM "users" LIMIT 0`;
    await prisma.$queryRaw`SELECT 1 FROM "auth" LIMIT 0`;
    console.log("[db:deploy] Verified core tables: users, auth");
  } catch (error) {
    console.error(
      "[db:deploy] Core tables are missing after migrate deploy.\n" +
        "If this database was partially initialized before, reset it once in Neon SQL Editor:\n" +
        "  DROP SCHEMA public CASCADE;\n" +
        "  CREATE SCHEMA public;\n" +
        "  GRANT ALL ON SCHEMA public TO public;\n" +
        "Then redeploy Production.",
    );
    if (error instanceof Error && error.message) {
      console.error(error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function shouldSkip() {
  if (isVercel && vercelEnv !== "production") {
    console.log(
      `[db:deploy] Skipping on Vercel (${vercelEnv || "unknown"}). ` +
        "Migrations run only on Production deployments.",
    );
    return true;
  }
  return false;
}

async function main() {
  await loadLocalEnvFiles();

  if (shouldSkip()) {
    return;
  }

  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) {
    if (isVercel && vercelEnv === "production") {
      console.error(
        "[db:deploy] Set POSTGRES_URL_NON_POOLING and DATABASE_URL in Vercel → Production.",
      );
      process.exit(1);
    }
    console.log("[db:deploy] Skipping: DATABASE_URL is not set.");
    return;
  }

  process.env.DATABASE_URL = databaseUrl;
  logDatabaseTarget(databaseUrl);

  console.log("[db:deploy] Running prisma migrate deploy…");
  let result = runMigrateDeploy(true);

  if (result.status !== 0 && isP3005Error(result.output)) {
    const baselineResult = baselineExistingDatabase();
    if (baselineResult.status !== 0) {
      process.exit(baselineResult.status);
    }
    await repairBaselineDrift();
    result = runMigrateDeploy(true);
  }

  if (result.status !== 0 && isP3018Error(result.output)) {
    const migrationName = extractFailedMigrationName(result.output);
    if (migrationName) {
      const resolveResult = resolveFailedMigration(migrationName);
      if (resolveResult.status !== 0) {
        process.exit(resolveResult.status);
      }
      result = runMigrateDeploy(true);
    }
  }

  if (result.status !== 0) {
    exitMigrateFailure(result);
  }

  await verifyCoreTables();
  console.log("[db:deploy] Done.");
}

main().catch((error) => {
  console.error("[db:deploy] Unexpected error:", error);
  process.exit(1);
});
