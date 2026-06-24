export type NestMember = {
    wordId: number;
    text: string;
};
/** Merges manual alternates with nest member texts, dropping blanks and case-insensitive duplicates. */
export declare function mergeVocabAlternateAnswers(manualAlternates: readonly string[], nestMemberTexts: readonly string[]): string[];
export declare function collectNestAlternateTexts(members: readonly {
    text: string;
}[], expectedText: string): string[];
//# sourceMappingURL=vocabNest.d.ts.map