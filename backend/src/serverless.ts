import type { Express } from "express";

import { createApp } from "./app.js";
import { initPrisma } from "./db/prisma.js";
import { bootstrapAdminRoles } from "./services/adminBootstrap.service.js";

let app: Express | undefined;
let bootstrapPromise: Promise<Express> | undefined;

/** Vercel / serverless entry — never imports loadEnv (host injects env vars). */
export async function getServerlessApp(databaseUrl: string): Promise<Express> {
  if (app) {
    return app;
  }

  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      initPrisma(databaseUrl);
      await bootstrapAdminRoles();
      app = createApp();
      return app;
    })();
  }

  return bootstrapPromise;
}
