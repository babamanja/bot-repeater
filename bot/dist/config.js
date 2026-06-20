function firstNonEmpty(...values) {
    for (const v of values) {
        const t = v?.trim();
        if (t)
            return t;
    }
    return '';
}
const config = {
    botToken: firstNonEmpty(process.env.TG_BOT_TOKEN, process.env.TELEGRAM_BOT_TOKEN),
    databaseUrl: process.env.DATABASE_URL ?? '',
    backendInternalUrl: firstNonEmpty(process.env.BACKEND_INTERNAL_URL, 'http://localhost:3001'),
    internalApiKey: process.env.INTERNAL_API_KEY ?? '',
};
if (!config.botToken) {
    throw new Error('Telegram bot token is not set. Set TG_BOT_TOKEN or TELEGRAM_BOT_TOKEN.');
}
if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is not set');
}
if (!config.internalApiKey) {
    throw new Error('INTERNAL_API_KEY is not set (required for Telegram Stars sync)');
}
export default config;
