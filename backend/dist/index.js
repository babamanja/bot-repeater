import { loadEnv } from "./config/loadEnv.js";
loadEnv();
import { createApp } from "./app.js";
import { disconnectPrisma, getPrisma, initPrisma } from "./db/prisma.js";
import { shutdownAnalytics } from "./services/analytics.service.js";
import { bootstrapAdminRoles } from "./services/adminBootstrap.service.js";
const PORT = Number(process.env.PORT) || 3001;
const databaseUrl = process.env.DATABASE_URL?.trim() ||
    `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`;
if (!databaseUrl || databaseUrl.includes("undefined")) {
    console.error("Missing DATABASE_URL or DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_DATABASE.");
    process.exit(1);
}
initPrisma(databaseUrl);
await getPrisma().$connect();
await bootstrapAdminRoles();
const app = createApp();
app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT} (APP_ENV=${process.env.APP_ENV ?? "local"})`);
});
const shutdown = async () => {
    await shutdownAnalytics();
    await disconnectPrisma();
    process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
