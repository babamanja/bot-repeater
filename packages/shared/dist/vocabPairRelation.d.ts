import { type WordWithLanguage } from "./vocabPair.js";
export declare const VOCAB_PAIR_RELATION_TYPES: readonly ["translation", "synonym", "antonym", "cognate", "inflection"];
export type VocabPairRelationType = (typeof VOCAB_PAIR_RELATION_TYPES)[number];
export declare function isVocabPairRelationType(value: unknown): value is VocabPairRelationType;
export declare function isCrossLanguageRelationType(relationType: VocabPairRelationType): boolean;
export declare function isInflectionRelationType(relationType: VocabPairRelationType): boolean;
export declare function isSameLanguageRelationType(relationType: VocabPairRelationType): boolean;
export declare function pairMatchesUserRelation(wordA: {
    languageId: number;
}, wordB: {
    languageId: number;
}, relationType: VocabPairRelationType, primaryLangId: number, learningLangId: number): boolean;
/** Maps pair sides to review/display slots (primaryWord / learningWord). */
export declare function resolvePairSidesForUser<T extends WordWithLanguage>(wordA: T, wordB: T, relationType: VocabPairRelationType, primaryLangId: number, learningLangId: number): {
    primaryWord: T;
    learningWord: T;
} | null;
//# sourceMappingURL=vocabPairRelation.d.ts.map