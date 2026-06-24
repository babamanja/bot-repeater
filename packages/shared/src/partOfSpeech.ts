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
] as const;

export type PartOfSpeech = (typeof PART_OF_SPEECH_VALUES)[number];

export function isPartOfSpeech(value: unknown): value is PartOfSpeech {
  return (
    typeof value === "string" &&
    (PART_OF_SPEECH_VALUES as readonly string[]).includes(value)
  );
}

export function normalizePartOfSpeechInput(
  value: unknown,
): PartOfSpeech | null | undefined {
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
