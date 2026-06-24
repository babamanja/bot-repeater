import type { Express } from "express";

export function loadServerlessApp(databaseUrl: string): Promise<Express>;
