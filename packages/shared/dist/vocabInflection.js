/** Merges manual alternates with inflected forms, dropping blanks and case-insensitive duplicates. */
export function mergeVocabAlternateAnswers(manualAlternates, inflectionForms) {
    const seen = new Set();
    const merged = [];
    for (const raw of [...manualAlternates, ...inflectionForms]) {
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
