export type WordInflection = {
    pairId: number;
    text: string;
};
/** Merges manual alternates with inflected forms, dropping blanks and case-insensitive duplicates. */
export declare function mergeVocabAlternateAnswers(manualAlternates: readonly string[], inflectionForms: readonly string[]): string[];
//# sourceMappingURL=vocabInflection.d.ts.map