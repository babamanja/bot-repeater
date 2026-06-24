export const PART_OF_SPEECH_VALUES = [
    "noun",
    "verb",
    "adjective",
    "adverb",
    "pronoun",
    "preposition",
    "conjunction",
    "interjection",
    "phrase",
    "other",
];
export function isPartOfSpeech(value) {
    return (typeof value === "string" &&
        PART_OF_SPEECH_VALUES.includes(value));
}
export function normalizePartOfSpeechInput(value) {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    if (typeof value !== "string") {
        return undefined;
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }
    return isPartOfSpeech(trimmed) ? trimmed : undefined;
}
