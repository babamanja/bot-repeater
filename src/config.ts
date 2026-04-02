function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const v of values) {
    const t = v?.trim();
    if (t) return t;
  }
  return '';
}

const config = {
  botToken: firstNonEmpty(process.env.TG_BOT_TOKEN, process.env.TELEGRAM_BOT_TOKEN),
  databaseUrl: process.env.DATABASE_URL ?? '',
};

if (!config.botToken) {
  throw new Error(
    'Telegram bot token is not set. Set TG_BOT_TOKEN or TELEGRAM_BOT_TOKEN. ' +
      'For Docker Compose: add TG_BOT_TOKEN=... to a .env file next to docker-compose.yml, or export it in the shell before `docker compose up`.',
  );
}
if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

export default config;
