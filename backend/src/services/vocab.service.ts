import { pairMatchesUserLanguages, resolvePairWordsForUser } from "@vocab-bot/shared/vocabPair";
import { getPrisma } from "../db/prisma.js";
import * as dictionaryRepository from "../db/dictionaryRepository.js";
import { initialSchedule } from "../domain/pimsleur-schedule.js";
import {
  vocabPairIncludesPrimaryWordWhere,
} from "../db/vocabPairRepository.js";
import * as vocabPairRepository from "../db/vocabPairRepository.js";

export type VocabLanguages = {
  primaryLangId: number;
  learningLangId: number;
  primaryName: string;
  learningName: string;
};

export type WordSuggestion = {
  pairId: number;
  learningText: string;
};

export type AddedWord = {
  vocabPairId: number;
  primaryWord: string;
  learningWord: string;
};

async function requireUserLanguages(userId: number): Promise<VocabLanguages | null> {
  const user = await getPrisma().user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      primaryLanguageId: true,
      learningLanguageId: true,
      primaryLanguage: { select: { name: true } },
      learningLanguage: { select: { name: true } },
    },
  });
  if (
    user?.primaryLanguageId == null ||
    user.learningLanguageId == null ||
    !user.primaryLanguage ||
    !user.learningLanguage
  ) {
    return null;
  }
  return {
    primaryLangId: user.primaryLanguageId,
    learningLangId: user.learningLanguageId,
    primaryName: user.primaryLanguage.name,
    learningName: user.learningLanguage.name,
  };
}

async function findOrCreateVocabWord(
  languageId: number,
  text: string,
): Promise<{ id: number; text: string }> {
  const word = await getPrisma().vocabWord.upsert({
    where: { languageId_text: { languageId, text } },
    update: {},
    create: { languageId, text },
  });
  return { id: word.id, text: word.text };
}

async function upsertVocabWord(languageId: number, text: string): Promise<number> {
  const word = await getPrisma().vocabWord.upsert({
    where: { languageId_text: { languageId, text } },
    update: { text },
    create: { languageId, text },
  });
  return word.id;
}

async function findExistingPairsForPrimaryWord(
  primaryWordId: number,
  learningLangId: number,
): Promise<WordSuggestion[]> {
  const pairs = await getPrisma().vocabPair.findMany({
    where: vocabPairIncludesPrimaryWordWhere(primaryWordId, learningLangId),
    select: {
      id: true,
      wordA: { select: { id: true, text: true, languageId: true } },
      wordB: { select: { id: true, text: true, languageId: true } },
    },
  });
  return pairs.map((pair) => {
    const otherWord =
      pair.wordA.id === primaryWordId ? pair.wordB : pair.wordA;
    return {
      pairId: pair.id,
      learningText: otherWord.text,
    };
  });
}

async function attachUserToVocabPair(
  userId: number,
  pairId: number,
  nowMs: number = Date.now(),
): Promise<void> {
  const schedule = initialSchedule(nowMs);
  await dictionaryRepository.attachPairToUserDefaultDictionary(userId, pairId, {
    pimsleurLevel: schedule.pimsleurLevel,
    nextReviewMs: schedule.nextReviewMs,
  });
}

async function loadAddedWord(
  pairId: number,
  primaryLangId: number,
  learningLangId: number,
): Promise<AddedWord | null> {
  const pair = await getPrisma().vocabPair.findUnique({
    where: { id: pairId },
    select: {
      id: true,
      wordA: { select: { text: true, languageId: true } },
      wordB: { select: { text: true, languageId: true } },
    },
  });
  if (!pair) {
    return null;
  }
  const resolved = resolvePairWordsForUser(
    pair.wordA,
    pair.wordB,
    primaryLangId,
    learningLangId,
  );
  if (!resolved) {
    return null;
  }
  return {
    vocabPairId: pair.id,
    primaryWord: resolved.primaryWord.text,
    learningWord: resolved.learningWord.text,
  };
}

export async function getVocabLanguages(userId: number) {
  if (!Number.isInteger(userId) || userId < 1) {
    return { ok: false as const, status: 401, error: "unauthorized" };
  }
  const languages = await requireUserLanguages(userId);
  if (!languages) {
    return { ok: false as const, status: 400, error: "languages_not_set" };
  }
  return {
    ok: true as const,
    languages: {
      primaryName: languages.primaryName,
      learningName: languages.learningName,
    },
  };
}

export async function lookupPrimaryWord(userId: number, primaryWordRaw: string) {
  if (!Number.isInteger(userId) || userId < 1) {
    return { ok: false as const, status: 401, error: "unauthorized" };
  }
  const primaryWord = primaryWordRaw.trim();
  if (!primaryWord) {
    return { ok: false as const, status: 400, error: "primary_word_required" };
  }

  const languages = await requireUserLanguages(userId);
  if (!languages) {
    return { ok: false as const, status: 400, error: "languages_not_set" };
  }

  const primary = await findOrCreateVocabWord(languages.primaryLangId, primaryWord);
  const suggestions = await findExistingPairsForPrimaryWord(primary.id, languages.learningLangId);

  return {
    ok: true as const,
    primaryWordId: primary.id,
    primaryText: primary.text,
    suggestions,
    learningLangName: languages.learningName,
  };
}

export async function addWordForUser(
  userId: number,
  input: { vocabPairId?: number; primaryWordId?: number; learningWord?: string },
) {
  if (!Number.isInteger(userId) || userId < 1) {
    return { ok: false as const, status: 401, error: "unauthorized" };
  }

  const languages = await requireUserLanguages(userId);
  if (!languages) {
    return { ok: false as const, status: 400, error: "languages_not_set" };
  }

  const nowMs = Date.now();

  if (input.vocabPairId != null) {
    const pairId = input.vocabPairId;
    if (!Number.isInteger(pairId) || pairId < 1) {
      return { ok: false as const, status: 400, error: "invalid_pair_id" };
    }

    const pair = await getPrisma().vocabPair.findUnique({
      where: { id: pairId },
      select: {
        wordA: { select: { languageId: true } },
        wordB: { select: { languageId: true } },
      },
    });
    if (
      !pair ||
      !pairMatchesUserLanguages(
        pair.wordA,
        pair.wordB,
        languages.primaryLangId,
        languages.learningLangId,
      )
    ) {
      return { ok: false as const, status: 404, error: "pair_not_found" };
    }

    await attachUserToVocabPair(userId, pairId, nowMs);
    const added = await loadAddedWord(pairId, languages.primaryLangId, languages.learningLangId);
    if (!added) {
      return { ok: false as const, status: 404, error: "pair_not_found" };
    }
    return { ok: true as const, word: added };
  }

  const rawPrimaryWordId = input.primaryWordId;
  const learningWord = input.learningWord?.trim() ?? "";
  if (
    typeof rawPrimaryWordId !== "number" ||
    !Number.isInteger(rawPrimaryWordId) ||
    rawPrimaryWordId < 1 ||
    !learningWord
  ) {
    return { ok: false as const, status: 400, error: "learning_word_required" };
  }
  const primaryWordId = rawPrimaryWordId;

  const primary = await getPrisma().vocabWord.findUnique({
    where: { id: primaryWordId },
    select: { id: true, languageId: true },
  });
  if (!primary || primary.languageId !== languages.primaryLangId) {
    return { ok: false as const, status: 400, error: "invalid_primary_word" };
  }

  const learningWordId = await upsertVocabWord(languages.learningLangId, learningWord);

  let pair = await vocabPairRepository.findTranslationByWordIds(primaryWordId, learningWordId);
  if (!pair) {
    pair = await vocabPairRepository.insertTranslation({
      wordIdOne: primaryWordId,
      wordIdTwo: learningWordId,
      primaryLanguageId: languages.primaryLangId,
      learningLanguageId: languages.learningLangId,
    });
  }

  await attachUserToVocabPair(userId, pair.id, nowMs);
  const added = await loadAddedWord(pair.id, languages.primaryLangId, languages.learningLangId);
  if (!added) {
    return { ok: false as const, status: 404, error: "pair_not_found" };
  }
  return { ok: true as const, word: added };
}
