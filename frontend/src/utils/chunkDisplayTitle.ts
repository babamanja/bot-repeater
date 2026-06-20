import type { DocumentChunkSummary } from "../api/document";

export function getChunkDisplayTitle(
  chunk: Pick<DocumentChunkSummary, "title" | "chunkIndex">,
  fallbackLabel: string,
): string {
  const title = chunk.title?.trim();
  if (title) {
    return title;
  }
  return fallbackLabel;
}
