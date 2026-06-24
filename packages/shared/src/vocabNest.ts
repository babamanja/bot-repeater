export type NestMember = {
  wordId: number;
  text: string;
};

/** Merges manual alternates with nest member texts, dropping blanks and case-insensitive duplicates. */
export function mergeVocabAlternateAnswers(
  manualAlternates: readonly string[],
  nestMemberTexts: readonly string[],
): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const raw of [...manualAlternates, ...nestMemberTexts]) {
    const trimmed = raw.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(trimmed);
  }

  return merged;
}

export function collectNestAlternateTexts(
  members: readonly { text: string }[],
  expectedText: string,
): string[] {
  const expectedNorm = expectedText.trim().toLowerCase();
  const seen = new Set<string>();
  const alternates: string[] = [];

  for (const member of members) {
    const trimmed = member.text.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (key === expectedNorm || seen.has(key)) {
      continue;
    }
    seen.add(key);
    alternates.push(trimmed);
  }

  return alternates;
}
