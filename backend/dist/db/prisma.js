import { PrismaClient } from "@prisma/client";
let prisma = null;
export function getPrisma() {
    if (!prisma) {
        throw new Error("Prisma not initialized. Call initPrisma() first.");
    }
    return prisma;
}
export function initPrisma(connectionString) {
    prisma = new PrismaClient({
        datasources: {
            db: { url: connectionString },
        },
    });
    return prisma;
}
export async function disconnectPrisma() {
    if (prisma) {
        await prisma.$disconnect();
        prisma = null;
    }
}
