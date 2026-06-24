import { pairMatchesUserLanguages, resolvePairWordsForUser, type WordWithLanguage } from "./vocabPair.js";

export const VOCAB_PAIR_RELATION_TYPES = [
  "translation",
  "synonym",
  "antonym",
  "cognate",
  "inflection",
] as const;

export type VocabPairRelationType = (typeof VOCAB_PAIR_RELATION_TYPES)[number];

export function isVocabPairRelationType(value: unknown): value is VocabPairRelationType {
  return (
    typeof value === "string" &&
    (VOCAB_PAIR_RELATION_TYPES as readonly string[]).includes(value)
  );
}

export function isCrossLanguageRelationType(relationType: VocabPairRelationType): boolean {
  return relationType === "translation";
}

export function isInflectionRelationType(relationType: VocabPairRelationType): boolean {
  return relationType === "inflection";
}

export function isSameLanguageRelationType(relationType: VocabPairRelationType): boolean {
  return (
    relationType === "synonym" ||
    relationType === "antonym" ||
    relationType === "cognate" ||
    relationType === "inflection"
  );
}

export function pairMatchesUserRelation(
  wordA: { languageId: number },
  wordB: { languageId: number },
  relationType: VocabPairRelationType,
  primaryLangId: number,
  learningLangId: number,
): boolean {
  if (isCrossLanguageRelationType(relationType)) {
    return pairMatchesUserLanguages(wordA, wordB, primaryLangId, learningLangId);
  }
  if (isSameLanguageRelationType(relationType)) {
    return (
      wordA.languageId === wordB.languageId &&
      (wordA.languageId === learningLangId || wordA.languageId === primaryLangId)
    );
  }
  return false;
}

/** Maps pair sides to review/display slots (primaryWord / learningWord). */
export function resolvePairSidesForUser<T extends WordWithLanguage>(
  wordA: T,
  wordB: T,
  relationType: VocabPairRelationType,
  primaryLangId: number,
  learningLangId: number,
): { primaryWord: T; learningWord: T } | null {
  if (isCrossLanguageRelationType(relationType)) {
    return resolvePairWordsForUser(wordA, wordB, primaryLangId, learningLangId);
  }
  if (isSameLanguageRelationType(relationType)) {
    if (wordA.languageId !== wordB.languageId) {
      return null;
    }
    return { primaryWord: wordA, learningWord: wordB };
  }
  return null;
}
