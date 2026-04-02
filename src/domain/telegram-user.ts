import type { PrismaClient } from '../../prisma/src/generated/prisma';
import { toBigInt } from './telegram-ids';

async function ensureTelegramUserExists(prisma: PrismaClient, telegramUserId: number): Promise<void> {
  await prisma.telegramUser.upsert({
    where: { id: toBigInt(telegramUserId) },
    update: {},
    create: { id: toBigInt(telegramUserId) },
  });
}

export async function getUserLanguages(
  prisma: PrismaClient,
  telegramUserId: number,
): Promise<{ primaryLangId: number | null; learningLangId: number | null }> {
  await ensureTelegramUserExists(prisma, telegramUserId);

  const user = await prisma.telegramUser.findUnique({
    where: { id: toBigInt(telegramUserId) },
    select: { primaryLanguageId: true, learningLanguageId: true },
  });

  return {
    primaryLangId: user?.primaryLanguageId ?? null,
    learningLangId: user?.learningLanguageId ?? null,
  };
}
