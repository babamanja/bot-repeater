/** Merges manual alternates with nest member texts, dropping blanks and case-insensitive duplicates. */
export function mergeVocabAlternateAnswers(manualAlternates, nestMemberTexts) {
    const seen = new Set();
    const merged = [];
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
export function collectNestAlternateTexts(members, expectedText) {
    const expectedNorm = expectedText.trim().toLowerCase();
    const seen = new Set();
    const alternates = [];
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
