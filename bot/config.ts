import { loadEnv } from "./config/loadEnv.js";

loadEnv();

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const v of values) {
    const t = v?.trim();
    if (t) return t;
  }
  return '';
}

function resolveDatabaseUrl(): string {
  const direct = process.env.DATABASE_URL?.trim();
  if (direct) {
    return direct;
  }
  const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_DATABASE } = process.env;
  if (DB_USER && DB_PASSWORD && DB_HOST && DB_PORT && DB_DATABASE) {
    return `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_DATABASE}`;
  }
  return '';
}

const config = {
  botToken: firstNonEmpty(process.env.TG_BOT_TOKEN, process.env.TELEGRAM_BOT_TOKEN),
  databaseUrl: resolveDatabaseUrl(),
  backendInternalUrl: firstNonEmpty(process.env.BACKEND_INTERNAL_URL, 'http://localhost:3001'),
  internalApiKey: process.env.INTERNAL_API_KEY ?? '',
};

if (!config.botToken) {
  throw new Error(
    'Telegram bot token is not set. Set TG_BOT_TOKEN or TELEGRAM_BOT_TOKEN.',
  );
}
if (!config.databaseUrl || config.databaseUrl.includes('undefined')) {
  throw new Error(
    'DATABASE_URL is not set (or set DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_DATABASE).',
  );
}
if (!config.internalApiKey) {
  throw new Error('INTERNAL_API_KEY is not set (required for Telegram Stars sync)');
}

export default config;
