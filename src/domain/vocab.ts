import { PrismaClient } from '../../prisma/src/generated/prisma';
import { initialSchedule, scheduleAfterCorrect, scheduleAfterWrong } from './pimsleur-schedule';
import { toBigInt } from './telegram-ids';
import { getUserLanguages } from './telegram-user';

export type DueVocabPair = {
  pairId: number;
  /** Learning-language side (shown first). */
  learningWord: string;
  /** Primary-language translation (shown under spoiler in review). */
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

export async function initVocabSchema(prisma: PrismaClient): Promise<void> {
  try {
    // Just a smoke-test: ensures tables exist (docker-entrypoint runs `prisma db push`).
    await prisma.vocabPair.count();
  } catch {
    throw new Error(
      'Prisma schema is not applied yet. Run `npx prisma db push` (or migrations) before starting the bot.',
    );
  }
}

async function requireUserLanguages(
  prisma: PrismaClient,
  telegramUserId: number,
): Promise<{ primaryLangId: number; learningLangId: number }> {
  const langs = await getUserLanguages(prisma, telegramUserId);

  if (langs.primaryLangId == null || langs.learningLangId == null) {
    throw new UserLanguagesNotSetError();
  }

  return {
    primaryLangId: langs.primaryLangId,
    learningLangId: langs.learningLangId,
  };
}

async function ensureUserPairsMembership(
  prisma: PrismaClient,
  telegramUserId: number,
  primaryLangId: number,
  learningLangId: number,
): Promise<void> {
  // Make all existing pairs between the user's languages available for them.
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
    data: pairs.map((p) => ({
      userId: toBigInt(telegramUserId),
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

/** Find or create a vocab word (no extra notifications). */
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

/** Existing pairs for this primary word and the user's learning language. */
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
  return pairs.map((p) => ({ pairId: p.id, learningText: p.learningWord.text }));
}

export async function attachUserToVocabPair(
  prisma: PrismaClient,
  telegramUserId: number,
  pairId: number,
  nowMs: number = Date.now(),
): Promise<void> {
  const s = initialSchedule(nowMs);
  await prisma.userPair.createMany({
    data: [
      {
        userId: toBigInt(telegramUserId),
        vocabPairId: pairId,
        pimsleurLevel: s.pimsleurLevel,
        nextReviewMs: s.nextReviewMs,
      },
    ],
    skipDuplicates: true,
  });
}

/** Create (or reuse) pair for primary + learning text, then attach user. */
export async function createPairFromPrimaryWordAndLearningText(
  prisma: PrismaClient,
  telegramUserId: number,
  primaryWordId: number,
  learningLangId: number,
  learningText: string,
  nowMs: number,
): Promise<number> {
  const learningWordId = await upsertVocabWord(prisma, learningLangId, learningText);

  let pair = await prisma.vocabPair.findUnique({
    where: { primaryWordId_learningWordId: { primaryWordId, learningWordId } },
  });
  if (!pair) {
    pair = await prisma.vocabPair.create({
      data: {
        primaryWordId,
        learningWordId,
      },
    });
  }

  const s = initialSchedule(nowMs);
  await prisma.userPair.createMany({
    data: [
      {
        userId: toBigInt(telegramUserId),
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
  const { primaryLangId, learningLangId } = await requireUserLanguages(prisma, telegramUserId);

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
        userId: toBigInt(telegramUserId),
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
  const { primaryLangId, learningLangId } = await requireUserLanguages(prisma, telegramUserId);
  await ensureUserPairsMembership(prisma, telegramUserId, primaryLangId, learningLangId);

  const dueRows = await prisma.userPair.findMany({
    where: {
      userId: toBigInt(telegramUserId),
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
  await prisma.$transaction(async (tx) => {
    await tx.language.upsert({
      where: { id: primaryLangId },
      update: {},
      // Placeholder name to satisfy schema; prefer `/addLang <langName>` for real names.
      create: { id: primaryLangId, name: `lang_${primaryLangId}` },
    });

    await tx.language.upsert({
      where: { id: learningLangId },
      update: {},
      // Placeholder name to satisfy schema; prefer `/addLang <langName>` for real names.
      create: { id: learningLangId, name: `lang_${learningLangId}` },
    });

    await tx.telegramUser.upsert({
      where: { id: toBigInt(telegramUserId) },
      update: { primaryLanguageId: primaryLangId, learningLanguageId: learningLangId },
      create: { id: toBigInt(telegramUserId), primaryLanguageId: primaryLangId, learningLanguageId: learningLangId },
    });
  });
}

export async function addLanguageById(prisma: PrismaClient, langId: number): Promise<void> {
  await prisma.language.upsert({
    where: { id: langId },
    update: {},
    // Placeholder name to satisfy schema; prefer `/addLang <langName>` for real names.
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

  // Update user languages only; doesn't auto-create languages.
  await prisma.telegramUser.upsert({
    where: { id: toBigInt(telegramUserId) },
    update: { primaryLanguageId: primaryLangId, learningLanguageId: learningLangId },
    create: {
      id: toBigInt(telegramUserId),
      primaryLanguageId: primaryLangId,
      learningLanguageId: learningLangId,
    },
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

/** Primary / learning language display names from DB, or null if not fully configured. */
export async function getUserLanguageNames(
  prisma: PrismaClient,
  telegramUserId: number,
): Promise<{ primaryName: string; learningName: string } | null> {
  const user = await prisma.telegramUser.findUnique({
    where: { id: toBigInt(telegramUserId) },
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
  await requireLanguageExists(prisma, langId);
  if (!kind) {
    throw new Error('Kind is required');
  }
  await prisma.telegramUser.upsert({
    where: { id: toBigInt(telegramUserId) },
    update: { [`${kind}LanguageId`]: langId },
    create: { id: toBigInt(telegramUserId), [`${kind}LanguageId`]: langId },
  });
}

export async function applyReviewResult(
  prisma: PrismaClient,
  telegramUserId: number,
  pairId: number,
  result: 'know' | 'dont',
  nowMs: number,
): Promise<{ learningWord: string; primaryWord: string }> {
  const up = await prisma.userPair.findUnique({
    where: { userId_vocabPairId: { userId: toBigInt(telegramUserId), vocabPairId: pairId } },
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
    where: { userId_vocabPairId: { userId: toBigInt(telegramUserId), vocabPairId: pairId } },
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
