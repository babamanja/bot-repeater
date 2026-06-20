import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!prisma) {
    throw new Error("Prisma not initialized. Call initPrisma() first.");
  }
  return prisma;
}

export function initPrisma(connectionString: string): PrismaClient {
  prisma = new PrismaClient({
    datasources: {
      db: { url: connectionString },
    },
  });
  return prisma;
}

export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}
