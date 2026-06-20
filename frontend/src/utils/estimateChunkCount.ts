/** Matches backend estimateDocumentChunkCount for UI previews. */
export function estimateChunkCount(
  textLength: number,
  chunkSizeChars: number,
  chunkOverlapChars: number,
): number {
  if (textLength <= 0) {
    return 0;
  }
  if (textLength <= chunkSizeChars) {
    return 1;
  }
  const step = Math.max(1, chunkSizeChars - chunkOverlapChars);
  return Math.ceil((textLength - chunkSizeChars) / step) + 1;
}
