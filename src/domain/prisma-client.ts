import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../prisma/src/generated/prisma';

export function createPrismaClient(databaseUrl: string): PrismaClient {
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  return new PrismaClient({ adapter });
}
