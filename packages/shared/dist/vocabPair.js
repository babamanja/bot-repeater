export function canonicalWordPairIds(wordIdOne, wordIdTwo) {
    if (wordIdOne === wordIdTwo) {
        throw new Error("word ids must differ");
    }
    return wordIdOne < wordIdTwo
        ? { wordAId: wordIdOne, wordBId: wordIdTwo }
        : { wordAId: wordIdTwo, wordBId: wordIdOne };
}
export function resolvePairWordsForUser(wordA, wordB, primaryLangId, learningLangId) {
    if (wordA.languageId === primaryLangId && wordB.languageId === learningLangId) {
        return { primaryWord: wordA, learningWord: wordB };
    }
    if (wordB.languageId === primaryLangId && wordA.languageId === learningLangId) {
        return { primaryWord: wordB, learningWord: wordA };
    }
    return null;
}
export function pairMatchesUserLanguages(wordA, wordB, primaryLangId, learningLangId) {
    const primaryOnA = wordA.languageId === primaryLangId && wordB.languageId === learningLangId;
    const primaryOnB = wordB.languageId === primaryLangId && wordA.languageId === learningLangId;
    return primaryOnA || primaryOnB;
}
