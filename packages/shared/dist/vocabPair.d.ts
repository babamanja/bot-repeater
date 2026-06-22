export type WordWithLanguage = {
    text: string;
    languageId: number;
};
export declare function canonicalWordPairIds(wordIdOne: number, wordIdTwo: number): {
    wordAId: number;
    wordBId: number;
};
export declare function resolvePairWordsForUser<T extends WordWithLanguage>(wordA: T, wordB: T, primaryLangId: number, learningLangId: number): {
    primaryWord: T;
    learningWord: T;
} | null;
export declare function pairMatchesUserLanguages(wordA: {
    languageId: number;
}, wordB: {
    languageId: number;
}, primaryLangId: number, learningLangId: number): boolean;
//# sourceMappingURL=vocabPair.d.ts.map