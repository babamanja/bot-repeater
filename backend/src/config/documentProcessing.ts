/** Max characters stored in chunk summary without AI (MVP placeholder). */
export function getDocumentSummaryMaxChars(): number {
  return 8_000;
}

/** Max characters for AI-generated chunk section title. */
export function getDocumentChunkTitleMaxChars(): number {
  return 120;
}
