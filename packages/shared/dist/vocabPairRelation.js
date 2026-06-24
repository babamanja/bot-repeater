import { pairMatchesUserLanguages, resolvePairWordsForUser } from "./vocabPair.js";
export const VOCAB_PAIR_RELATION_TYPES = [
    "translation",
    "synonym",
    "antonym",
    "cognate",
    "inflection",
];
export function isVocabPairRelationType(value) {
    return (typeof value === "string" &&
        VOCAB_PAIR_RELATION_TYPES.includes(value));
}
export function isCrossLanguageRelationType(relationType) {
    return relationType === "translation";
}
export function isInflectionRelationType(relationType) {
    return relationType === "inflection";
}
export function isSameLanguageRelationType(relationType) {
    return (relationType === "synonym" ||
        relationType === "antonym" ||
        relationType === "cognate" ||
        relationType === "inflection");
}
export function pairMatchesUserRelation(wordA, wordB, relationType, primaryLangId, learningLangId) {
    if (isCrossLanguageRelationType(relationType)) {
        return pairMatchesUserLanguages(wordA, wordB, primaryLangId, learningLangId);
    }
    if (isSameLanguageRelationType(relationType)) {
        return (wordA.languageId === wordB.languageId &&
            (wordA.languageId === learningLangId || wordA.languageId === primaryLangId));
    }
    return false;
}
/** Maps pair sides to review/display slots (primaryWord / learningWord). */
export function resolvePairSidesForUser(wordA, wordB, relationType, primaryLangId, learningLangId) {
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
