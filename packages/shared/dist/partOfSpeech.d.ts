export declare const PART_OF_SPEECH_VALUES: readonly ["noun", "verb", "adjective", "adverb", "pronoun", "preposition", "conjunction", "interjection", "phrase", "other"];
export type PartOfSpeech = (typeof PART_OF_SPEECH_VALUES)[number];
export declare function isPartOfSpeech(value: unknown): value is PartOfSpeech;
export declare function normalizePartOfSpeechInput(value: unknown): PartOfSpeech | null | undefined;
//# sourceMappingURL=partOfSpeech.d.ts.map