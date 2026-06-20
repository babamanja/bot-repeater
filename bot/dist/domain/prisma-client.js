import { PrismaClient } from "@prisma/client";
let prisma = null;
export function createPrismaClient(databaseUrl) {
    if (prisma) {
        return prisma;
    }
    prisma = new PrismaClient({
        datasources: { db: { url: databaseUrl } },
    });
    return prisma;
}
export function getPrismaClient() {
    if (!prisma) {
        throw new Error("Prisma client is not initialized");
    }
    return prisma;
}
