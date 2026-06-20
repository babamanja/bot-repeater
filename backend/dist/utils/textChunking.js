/**
 * Splits text into chunks up to maxChars, preferring paragraph boundaries.
 * When overlapChars > 0, consecutive chunks share trailing/leading context.
 */
export function splitTextIntoChunks(fullText, maxChars, overlapChars = 0) {
    const normalized = fullText.replace(/\r\n/g, "\n").trim();
    if (!normalized) {
        return [];
    }
    if (normalized.length <= maxChars) {
        return [normalized];
    }
    const chunks = [];
    let start = 0;
    while (start < normalized.length) {
        let end = Math.min(start + maxChars, normalized.length);
        if (end < normalized.length) {
            const paragraphBreak = normalized.lastIndexOf("\n\n", end);
            const lineBreak = normalized.lastIndexOf("\n", end);
            const spaceBreak = normalized.lastIndexOf(" ", end);
            const preferredBreak = Math.max(paragraphBreak, lineBreak, spaceBreak);
            if (preferredBreak > start + Math.floor(maxChars * 0.5)) {
                end = preferredBreak;
            }
        }
        const piece = normalized.slice(start, end).trim();
        if (piece) {
            chunks.push(piece);
        }
        if (end >= normalized.length) {
            break;
        }
        if (overlapChars > 0) {
            start = Math.max(start + 1, end - overlapChars);
        }
        else {
            start = end;
            while (start < normalized.length && /\s/.test(normalized[start] ?? "")) {
                start += 1;
            }
        }
    }
    return chunks;
}
