export type WordWithLanguage = {
  text: string;
  languageId: number;
};

export function canonicalWordPairIds(
  wordIdOne: number,
  wordIdTwo: number,
): { wordAId: number; wordBId: number } {
  if (wordIdOne === wordIdTwo) {
    throw new Error("word ids must differ");
  }
  return wordIdOne < wordIdTwo
    ? { wordAId: wordIdOne, wordBId: wordIdTwo }
    : { wordAId: wordIdTwo, wordBId: wordIdOne };
}

export function resolvePairWordsForUser<T extends WordWithLanguage>(
  wordA: T,
  wordB: T,
  primaryLangId: number,
  learningLangId: number,
): { primaryWord: T; learningWord: T } | null {
  if (wordA.languageId === primaryLangId && wordB.languageId === learningLangId) {
    return { primaryWord: wordA, learningWord: wordB };
  }
  if (wordB.languageId === primaryLangId && wordA.languageId === learningLangId) {
    return { primaryWord: wordB, learningWord: wordA };
  }
  return null;
}

export function pairMatchesUserLanguages(
  wordA: { languageId: number },
  wordB: { languageId: number },
  primaryLangId: number,
  learningLangId: number,
): boolean {
  const primaryOnA = wordA.languageId === primaryLangId && wordB.languageId === learningLangId;
  const primaryOnB = wordB.languageId === primaryLangId && wordA.languageId === learningLangId;
  return primaryOnA || primaryOnB;
}
