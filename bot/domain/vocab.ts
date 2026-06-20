import type { PrismaClient } from '@prisma/client';
import { initialSchedule, scheduleAfterCorrect, scheduleAfterWrong } from './pimsleur-schedule';
import { toBigInt } from './telegram-ids';
import { getUserIdByTelegram, getUserLanguages } from './telegram-user';

export type DueVocabPair = {
  pairId: number;
  learningWord: string;
  primaryWord: string;
};

export class UserLanguagesNotSetError extends Error {
  constructor() {
    super('User languages are not set yet');
    this.name = 'UserLanguagesNotSetError';
  }
}

export class LanguageNotFoundError extends Error {
  public readonly missingLangIds: number[];

  constructor(missingLangIds: number[]) {
    super(`Language(s) not found: ${missingLangIds.join(', ')}`);
    this.name = 'LanguageNotFoundError';
    this.missingLangIds = missingLangIds;
  }
}

export class UserNotLinkedError extends Error {
  constructor() {
    super('Telegram user is not linked to an account');
    this.name = 'UserNotLinkedError';
  }
}

async function requireInternalUserId(
  prisma: PrismaClient,
  telegramUserId: number,
): Promise<number> {
  const userId = await getUserIdByTelegram(prisma, telegramUserId);
  if (userId == null) {
    throw new UserNotLinkedError();
  }
  return userId;
}

export async function initVocabSchema(prisma: PrismaClient): Promise<void> {
  try {
    await prisma.vocabPair.count();
  } catch {
    throw new Error(
      'Prisma schema is not applied yet. Run prisma migrate deploy before starting the bot.',
    );
  }
}

async function requireUserLanguages(
  prisma: PrismaClient,
  telegramUserId: number,
): Promise<{ primaryLangId: number; learningLangId: number; userId: number }> {
  const langs = await getUserLanguages(prisma, telegramUserId);

  if (langs.primaryLangId == null || langs.learningLangId == null || langs.userId == null) {
    throw new UserLanguagesNotSetError();
  }

  return {
    userId: langs.userId,
    primaryLangId: langs.primaryLangId,
    learningLangId: langs.learningLangId,
  };
}

async function ensureUserPairsMembership(
  prisma: PrismaClient,
  userId: number,
  primaryLangId: number,
  learningLangId: number,
): Promise<void> {
  const pairs = await prisma.vocabPair.findMany({
    where: {
      primaryWord: { languageId: primaryLangId },
      learningWord: { languageId: learningLangId },
    },
    select: { id: true },
  });

  if (pairs.length === 0) return;

  const nowMs = Date.now();
  const s = initialSchedule(nowMs);
  await prisma.userPair.createMany({
    data: pairs.map((p: { id: number }) => ({
      userId,
      vocabPairId: p.id,
      pimsleurLevel: s.pimsleurLevel,
      nextReviewMs: s.nextReviewMs,
    })),
    skipDuplicates: true,
  });
}

async function upsertVocabWord(
  prisma: PrismaClient,
  languageId: number,
  text: string,
): Promise<number> {
  const word = await prisma.vocabWord.upsert({
    where: { languageId_text: { languageId, text } },
    update: { text },
    create: { languageId, text },
  });
  return word.id;
}

export async function findOrCreateVocabWord(
  prisma: PrismaClient,
  languageId: number,
  text: string,
): Promise<{ id: number; text: string }> {
  const word = await prisma.vocabWord.upsert({
    where: { languageId_text: { languageId, text } },
    update: {},
    create: { languageId, text },
  });
  return { id: word.id, text: word.text };
}

export async function findExistingPairsForPrimaryWord(
  prisma: PrismaClient,
  primaryWordId: number,
  learningLangId: number,
): Promise<Array<{ pairId: number; learningText: string }>> {
  const pairs = await prisma.vocabPair.findMany({
    where: {
      primaryWordId,
      learningWord: { languageId: learningLangId },
    },
    select: {
      id: true,
      learningWord: { select: { text: true } },
    },
  });
  return pairs.map((p: { id: number; learningWord: { text: string } }) => ({
    pairId: p.id,
    learningText: p.learningWord.text,
  }));
}

export async function attachUserToVocabPair(
  prisma: PrismaClient,
  telegramUserId: number,
  pairId: number,
  nowMs: number = Date.now(),
): Promise<void> {
  const userId = await requireInternalUserId(prisma, telegramUserId);
  const s = initialSchedule(nowMs);
  await prisma.userPair.createMany({
    data: [
      {
        userId,
        vocabPairId: pairId,
        pimsleurLevel: s.pimsleurLevel,
        nextReviewMs: s.nextReviewMs,
      },
    ],
    skipDuplicates: true,
  });
}

export async function createPairFromPrimaryWordAndLearningText(
  prisma: PrismaClient,
  telegramUserId: number,
  primaryWordId: number,
  learningLangId: number,
  learningText: string,
  nowMs: number,
): Promise<number> {
  const userId = await requireInternalUserId(prisma, telegramUserId);
  const learningWordId = await upsertVocabWord(prisma, learningLangId, learningText);

  let pair = await prisma.vocabPair.findUnique({
    where: { primaryWordId_learningWordId: { primaryWordId, learningWordId } },
  });
  if (!pair) {
    pair = await prisma.vocabPair.create({
      data: { primaryWordId, learningWordId },
    });
  }

  const s = initialSchedule(nowMs);
  await prisma.userPair.createMany({
    data: [
      {
        userId,
        vocabPairId: pair.id,
        pimsleurLevel: s.pimsleurLevel,
        nextReviewMs: s.nextReviewMs,
      },
    ],
    skipDuplicates: true,
  });

  return pair.id;
}

export async function addWordPair(
  prisma: PrismaClient,
  telegramUserId: number,
  promptWord: string,
  answerWord: string,
  nowMs: number,
): Promise<number> {
  const { userId, primaryLangId, learningLangId } = await requireUserLanguages(
    prisma,
    telegramUserId,
  );

  const primaryWordId = await upsertVocabWord(prisma, primaryLangId, promptWord);
  const learningWordId = await upsertVocabWord(prisma, learningLangId, answerWord);

  let pair = await prisma.vocabPair.findUnique({
    where: { primaryWordId_learningWordId: { primaryWordId, learningWordId } },
  });
  if (!pair) {
    pair = await prisma.vocabPair.create({
      data: { primaryWordId, learningWordId },
    });
  }

  const s = initialSchedule(nowMs);
  await prisma.userPair.createMany({
    data: [
      {
        userId,
        vocabPairId: pair.id,
        pimsleurLevel: s.pimsleurLevel,
        nextReviewMs: s.nextReviewMs,
      },
    ],
    skipDuplicates: true,
  });

  return pair.id;
}

export async function getRandomDueWordsForUser(
  prisma: PrismaClient,
  telegramUserId: number,
  nowMs: number,
  limit: number,
): Promise<DueVocabPair[]> {
  const { userId, primaryLangId, learningLangId } = await requireUserLanguages(
    prisma,
    telegramUserId,
  );
  await ensureUserPairsMembership(prisma, userId, primaryLangId, learningLangId);

  const dueRows = await prisma.userPair.findMany({
    where: {
      userId,
      nextReviewMs: { lte: toBigInt(nowMs) },
    },
    include: {
      vocabPair: {
        include: {
          primaryWord: { select: { text: true } },
          learningWord: { select: { text: true } },
        },
      },
    },
  });

  if (dueRows.length === 0) return [];

  for (let i = dueRows.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [dueRows[i], dueRows[j]] = [dueRows[j], dueRows[i]];
  }

  const cap = Math.min(limit, dueRows.length);
  const out: DueVocabPair[] = [];
  for (let i = 0; i < cap; i++) {
    const vp = dueRows[i].vocabPair;
    out.push({
      pairId: vp.id,
      learningWord: vp.learningWord.text,
      primaryWord: vp.primaryWord.text,
    });
  }
  return out;
}

export async function getRandomDueWordForUser(
  prisma: PrismaClient,
  telegramUserId: number,
  nowMs: number,
): Promise<DueVocabPair | null> {
  const words = await getRandomDueWordsForUser(prisma, telegramUserId, nowMs, 1);
  return words[0] ?? null;
}

export async function setUserLanguages(
  prisma: PrismaClient,
  telegramUserId: number,
  primaryLangId: number,
  learningLangId: number,
): Promise<void> {
  const userId = await requireInternalUserId(prisma, telegramUserId);

  await prisma.$transaction(async (tx: PrismaClient) => {
    await tx.language.upsert({
      where: { id: primaryLangId },
      update: {},
      create: { id: primaryLangId, name: `lang_${primaryLangId}` },
    });

    await tx.language.upsert({
      where: { id: learningLangId },
      update: {},
      create: { id: learningLangId, name: `lang_${learningLangId}` },
    });

    await tx.user.update({
      where: { id: userId },
      data: { primaryLanguageId: primaryLangId, learningLanguageId: learningLangId },
    });
  });
}

export async function addLanguageById(prisma: PrismaClient, langId: number): Promise<void> {
  await prisma.language.upsert({
    where: { id: langId },
    update: {},
    create: { id: langId, name: `lang_${langId}` },
  });
}

export async function addLanguageByName(prisma: PrismaClient, langName: string): Promise<number> {
  const lang = await prisma.language.upsert({
    where: { name: langName },
    update: {},
    create: { name: langName },
  });
  return lang.id;
}

export async function setUserLangsStrict(
  prisma: PrismaClient,
  telegramUserId: number,
  primaryLangId: number,
  learningLangId: number,
): Promise<void> {
  const userId = await requireInternalUserId(prisma, telegramUserId);

  const [primaryLang, learningLang] = await Promise.all([
    prisma.language.findUnique({ where: { id: primaryLangId } }),
    prisma.language.findUnique({ where: { id: learningLangId } }),
  ]);

  const missing: number[] = [];
  if (!primaryLang) missing.push(primaryLangId);
  if (!learningLang) missing.push(learningLangId);
  if (missing.length > 0) {
    throw new LanguageNotFoundError(missing);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { primaryLanguageId: primaryLangId, learningLanguageId: learningLangId },
  });
}

export async function getAllLanguages(
  prisma: PrismaClient,
): Promise<Array<{ id: number; name: string }>> {
  return prisma.language.findMany({
    select: { id: true, name: true },
    orderBy: { id: 'asc' },
  });
}

export async function getUserLanguageNames(
  prisma: PrismaClient,
  telegramUserId: number,
): Promise<{ primaryName: string; learningName: string } | null> {
  const userId = await getUserIdByTelegram(prisma, telegramUserId);
  if (userId == null) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      primaryLanguage: { select: { name: true } },
      learningLanguage: { select: { name: true } },
    },
  });

  const primaryName = user?.primaryLanguage?.name;
  const learningName = user?.learningLanguage?.name;
  if (!primaryName || !learningName) return null;

  return { primaryName, learningName };
}

async function requireLanguageExists(prisma: PrismaClient, langId: number): Promise<void> {
  const lang = await prisma.language.findUnique({ where: { id: langId } });
  if (!lang) {
    throw new LanguageNotFoundError([langId]);
  }
}

export async function setUserLanguage(
  prisma: PrismaClient,
  telegramUserId: number,
  langId: number,
  kind?: 'primary' | 'learning',
): Promise<void> {
  const userId = await requireInternalUserId(prisma, telegramUserId);
  await requireLanguageExists(prisma, langId);
  if (!kind) {
    throw new Error('Kind is required');
  }
  await prisma.user.update({
    where: { id: userId },
    data: { [`${kind}LanguageId`]: langId },
  });
}

export async function applyReviewResult(
  prisma: PrismaClient,
  telegramUserId: number,
  pairId: number,
  result: 'know' | 'dont',
  nowMs: number,
): Promise<{ learningWord: string; primaryWord: string }> {
  const userId = await requireInternalUserId(prisma, telegramUserId);

  const up = await prisma.userPair.findUnique({
    where: { userId_vocabPairId: { userId, vocabPairId: pairId } },
    include: {
      vocabPair: {
        include: {
          learningWord: { select: { text: true } },
          primaryWord: { select: { text: true } },
        },
      },
    },
  });

  if (!up) {
    throw new Error(`UserPair not found: user=${telegramUserId} pair=${pairId}`);
  }

  const sch =
    result === 'know'
      ? scheduleAfterCorrect(up.pimsleurLevel, nowMs)
      : scheduleAfterWrong(nowMs);

  await prisma.userPair.update({
    where: { userId_vocabPairId: { userId, vocabPairId: pairId } },
    data: {
      pimsleurLevel: sch.pimsleurLevel,
      nextReviewMs: sch.nextReviewMs,
    },
  });

  return {
    learningWord: up.vocabPair.learningWord.text,
    primaryWord: up.vocabPair.primaryWord.text,
  };
}
