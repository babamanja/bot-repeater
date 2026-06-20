export const TABLE_CELL_TEXT_MAX_LENGTH = 60;

export function truncateText(text: string, maxLength = TABLE_CELL_TEXT_MAX_LENGTH): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength)}…`;
}

export function truncateTextWithTitle(
  text: string,
  maxLength = TABLE_CELL_TEXT_MAX_LENGTH,
): { display: string; title?: string } {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) {
    return { display: trimmed };
  }
  return { display: truncateText(trimmed, maxLength), title: trimmed };
}
