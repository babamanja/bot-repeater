import type { Prisma } from "@prisma/client";
import { getPrisma } from "../db/prisma.js";

export type LanguageSource = "web" | "telegram";

type UserLanguages = {
  primaryLanguageId: number | null;
  learningLanguageId: number | null;
};

type DictionaryEntrySchedule = {
  pimsleurLevel: number;
  nextReviewMs: bigint;
  pimsleurLevelReverse: number;
  nextReviewMsReverse: bigint;
  alternatePrimaryAnswers: string[];
  alternateLearningAnswers: string[];
};

function pickBetterForward(
  a: Pick<DictionaryEntrySchedule, "pimsleurLevel" | "nextReviewMs">,
  b: Pick<DictionaryEntrySchedule, "pimsleurLevel" | "nextReviewMs">,
): Pick<DictionaryEntrySchedule, "pimsleurLevel" | "nextReviewMs"> {
  if (a.pimsleurLevel !== b.pimsleurLevel) {
    return a.pimsleurLevel > b.pimsleurLevel ? a : b;
  }
  return a.nextReviewMs >= b.nextReviewMs ? a : b;
}

function pickBetterReverse(
  a: Pick<DictionaryEntrySchedule, "pimsleurLevelReverse" | "nextReviewMsReverse">,
  b: Pick<DictionaryEntrySchedule, "pimsleurLevelReverse" | "nextReviewMsReverse">,
): Pick<DictionaryEntrySchedule, "pimsleurLevelReverse" | "nextReviewMsReverse"> {
  if (a.pimsleurLevelReverse !== b.pimsleurLevelReverse) {
    return a.pimsleurLevelReverse > b.pimsleurLevelReverse ? a : b;
  }
  return a.nextReviewMsReverse >= b.nextReviewMsReverse ? a : b;
}

function mergeEntrySchedules(
  target: DictionaryEntrySchedule,
  source: DictionaryEntrySchedule,
): DictionaryEntrySchedule {
  const forward = pickBetterForward(target, source);
  const reverse = pickBetterReverse(target, source);
  return {
    pimsleurLevel: forward.pimsleurLevel,
    nextReviewMs: forward.nextReviewMs,
    pimsleurLevelReverse: reverse.pimsleurLevelReverse,
    nextReviewMsReverse: reverse.nextReviewMsReverse,
    alternatePrimaryAnswers: [
      ...new Set([...target.alternatePrimaryAnswers, ...source.alternatePrimaryAnswers]),
    ],
    alternateLearningAnswers: [
      ...new Set([...target.alternateLearningAnswers, ...source.alternateLearningAnswers]),
    ],
  };
}

function subscriptionRank(planCode: string, status: string): number {
  if (planCode === "premium" && (status === "active" || status === "past_due")) {
    return 3;
  }
  if (planCode === "premium") {
    return 2;
  }
  if (status === "active" || status === "past_due") {
    return 1;
  }
  return 0;
}

async function mergeDictionaryEntries(
  tx: Prisma.TransactionClient,
  targetDictionaryId: number,
  sourceDictionaryId: number,
): Promise<void> {
  if (targetDictionaryId === sourceDictionaryId) {
    return;
  }

  const sourceEntries = await tx.dictionaryEntry.findMany({
    where: { dictionaryId: sourceDictionaryId },
  });
  if (sourceEntries.length === 0) {
    return;
  }

  const targetEntries = await tx.dictionaryEntry.findMany({
    where: {
      dictionaryId: targetDictionaryId,
      vocabPairId: { in: sourceEntries.map((entry) => entry.vocabPairId) },
    },
  });
  const targetByPairId = new Map(targetEntries.map((entry) => [entry.vocabPairId, entry]));

  for (const sourceEntry of sourceEntries) {
    const existing = targetByPairId.get(sourceEntry.vocabPairId);
    if (!existing) {
      await tx.dictionaryEntry.create({
        data: {
          dictionaryId: targetDictionaryId,
          vocabPairId: sourceEntry.vocabPairId,
          pimsleurLevel: sourceEntry.pimsleurLevel,
          nextReviewMs: sourceEntry.nextReviewMs,
          pimsleurLevelReverse: sourceEntry.pimsleurLevelReverse,
          nextReviewMsReverse: sourceEntry.nextReviewMsReverse,
          alternatePrimaryAnswers: sourceEntry.alternatePrimaryAnswers,
          alternateLearningAnswers: sourceEntry.alternateLearningAnswers,
        },
      });
      continue;
    }

    const merged = mergeEntrySchedules(existing, sourceEntry);
    await tx.dictionaryEntry.update({
      where: {
        dictionaryId_vocabPairId: {
          dictionaryId: targetDictionaryId,
          vocabPairId: sourceEntry.vocabPairId,
        },
      },
      data: merged,
    });
  }
}

async function ensureDefaultDictionaryIdTx(
  tx: Prisma.TransactionClient,
  userId: number,
): Promise<number> {
  const existing = await tx.userDictionary.findFirst({
    where: { userId, isDefault: true },
    select: { dictionaryId: true },
  });
  if (existing) {
    return existing.dictionaryId;
  }

  const dictionary = await tx.dictionary.create({
    data: {
      creatorId: userId,
      name: "My dictionary",
      members: {
        create: {
          userId,
          isDefault: true,
        },
      },
    },
    select: { id: true },
  });
  return dictionary.id;
}

async function mergeUserDictionaries(
  tx: Prisma.TransactionClient,
  webUserId: number,
  telegramUserId: number,
): Promise<void> {
  const webDefaultId = await ensureDefaultDictionaryIdTx(tx, webUserId);
  const telegramDefaultId = await ensureDefaultDictionaryIdTx(tx, telegramUserId);
  await mergeDictionaryEntries(tx, webDefaultId, telegramDefaultId);

  const telegramLinks = await tx.userDictionary.findMany({
    where: { userId: telegramUserId },
    select: { dictionaryId: true, isDefault: true },
  });

  for (const link of telegramLinks) {
    if (link.dictionaryId === telegramDefaultId) {
      continue;
    }
    await tx.userDictionary.upsert({
      where: {
        userId_dictionaryId: {
          userId: webUserId,
          dictionaryId: link.dictionaryId,
        },
      },
      update: {},
      create: {
        userId: webUserId,
        dictionaryId: link.dictionaryId,
        isDefault: false,
      },
    });
  }
}

async function mergeSubscription(
  tx: Prisma.TransactionClient,
  webUserId: number,
  telegramUserId: number,
): Promise<void> {
  const [webSub, telegramSub] = await Promise.all([
    tx.subscription.findUnique({ where: { userId: webUserId } }),
    tx.subscription.findUnique({ where: { userId: telegramUserId } }),
  ]);

  if (!telegramSub) {
    return;
  }

  const webRank = webSub
    ? subscriptionRank(webSub.planCode, webSub.status)
    : 0;
  const telegramRank = subscriptionRank(telegramSub.planCode, telegramSub.status);
  const winner = telegramRank > webRank ? telegramSub : webSub;
  if (!winner) {
    return;
  }

  await tx.subscription.upsert({
    where: { userId: webUserId },
    update: {
      planCode: winner.planCode,
      status: winner.status,
      currentPeriodEnd: winner.currentPeriodEnd,
      paymentId: winner.paymentId,
    },
    create: {
      userId: webUserId,
      planCode: winner.planCode,
      status: winner.status,
      currentPeriodEnd: winner.currentPeriodEnd,
      paymentId: winner.paymentId,
    },
  });

  if (telegramSub.userId !== webUserId) {
    await tx.subscription.updateMany({
      where: { userId: telegramUserId },
      data: {
        planCode: "basic",
        status: "active",
        currentPeriodEnd: null,
        paymentId: null,
      },
    });
  }
}

export function resolveLanguagesForMerge(input: {
  webLanguages: UserLanguages;
  telegramLanguages: UserLanguages;
  languageSource?: LanguageSource;
}): { ok: true; languages: UserLanguages } | { ok: false; needsLanguageChoice: true } {
  const webComplete =
    input.webLanguages.primaryLanguageId != null &&
    input.webLanguages.learningLanguageId != null;
  const telegramComplete =
    input.telegramLanguages.primaryLanguageId != null &&
    input.telegramLanguages.learningLanguageId != null;

  if (!webComplete && !telegramComplete) {
    return {
      ok: true,
      languages: { primaryLanguageId: null, learningLanguageId: null },
    };
  }
  if (webComplete && !telegramComplete) {
    return { ok: true, languages: input.webLanguages };
  }
  if (!webComplete && telegramComplete) {
    return { ok: true, languages: input.telegramLanguages };
  }

  const sameLanguages =
    input.webLanguages.primaryLanguageId === input.telegramLanguages.primaryLanguageId &&
    input.webLanguages.learningLanguageId === input.telegramLanguages.learningLanguageId;
  if (sameLanguages) {
    return { ok: true, languages: input.webLanguages };
  }

  if (!input.languageSource) {
    return { ok: false, needsLanguageChoice: true };
  }

  return {
    ok: true,
    languages:
      input.languageSource === "web" ? input.webLanguages : input.telegramLanguages,
  };
}

export async function mergeTelegramUserIntoWebUser(input: {
  webUserId: number;
  telegramUserId: number;
  languageSource?: LanguageSource;
  telegramId: bigint;
  telegramUsername?: string | null;
  telegramDisplayName?: string;
}): Promise<
  | { ok: true }
  | { ok: false; error: string }
  | { ok: false; needsLanguageChoice: true }
> {
  if (input.webUserId === input.telegramUserId) {
    return { ok: false, error: "cannot merge account with itself" };
  }

  const prisma = getPrisma();
  const [webUser, telegramUser] = await Promise.all([
    prisma.user.findFirst({
      where: { id: input.webUserId, deletedAt: null },
      select: {
        id: true,
        email: true,
        telegramId: true,
        primaryLanguageId: true,
        learningLanguageId: true,
        auth: { select: { passwordHash: true, googleSub: true } },
      },
    }),
    prisma.user.findFirst({
      where: { id: input.telegramUserId, deletedAt: null },
      select: {
        id: true,
        telegramId: true,
        primaryLanguageId: true,
        learningLanguageId: true,
      },
    }),
  ]);

  if (!webUser) {
    return { ok: false, error: "web user not found" };
  }
  if (!telegramUser) {
    return { ok: false, error: "telegram user not found" };
  }

  const hasWebLogin =
    Boolean(webUser.email?.trim()) ||
    Boolean(webUser.auth?.passwordHash) ||
    Boolean(webUser.auth?.googleSub);
  if (!hasWebLogin) {
    return { ok: false, error: "target account is not a web account" };
  }
  if (telegramUser.telegramId == null) {
    return { ok: false, error: "telegram user has no telegram id" };
  }
  if (
    webUser.telegramId != null &&
    webUser.telegramId !== input.telegramId &&
    webUser.telegramId !== telegramUser.telegramId
  ) {
    return { ok: false, error: "web account already linked to another telegram" };
  }

  const languageResolution = resolveLanguagesForMerge({
    webLanguages: {
      primaryLanguageId: webUser.primaryLanguageId,
      learningLanguageId: webUser.learningLanguageId,
    },
    telegramLanguages: {
      primaryLanguageId: telegramUser.primaryLanguageId,
      learningLanguageId: telegramUser.learningLanguageId,
    },
    languageSource: input.languageSource,
  });
  if (!languageResolution.ok) {
    return { ok: false, needsLanguageChoice: true };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: input.telegramUserId },
      data: {
        telegramId: null,
        telegramUsername: null,
        deletedAt: new Date(),
      },
    });

    await mergeUserDictionaries(tx, input.webUserId, input.telegramUserId);
    await mergeSubscription(tx, input.webUserId, input.telegramUserId);

    await tx.payment.updateMany({
      where: { userId: input.telegramUserId },
      data: { userId: input.webUserId },
    });
    await tx.userFeedback.updateMany({
      where: { userId: input.telegramUserId },
      data: { userId: input.webUserId },
    });
    await tx.aiUsageAnalytics.updateMany({
      where: { userId: input.telegramUserId },
      data: { userId: input.webUserId },
    });

    await tx.user.update({
      where: { id: input.webUserId },
      data: {
        telegramId: input.telegramId,
        telegramUsername: input.telegramUsername ?? null,
        ...(input.telegramDisplayName ? { userName: input.telegramDisplayName } : {}),
        primaryLanguageId: languageResolution.languages.primaryLanguageId,
        learningLanguageId: languageResolution.languages.learningLanguageId,
      },
    });
  });

  return { ok: true };
}
