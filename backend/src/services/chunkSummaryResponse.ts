import {
  getDocumentChunkTitleMaxChars,
  getDocumentSummaryMaxChars,
} from "../config/documentProcessing.js";

export type ParsedChunkSummary = {
  title: string;
  summary: string;
};

function clampTitle(title: string): string {
  const maxChars = getDocumentChunkTitleMaxChars();
  const trimmed = title.replace(/\s+/g, " ").trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.length <= maxChars) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxChars).trimEnd()}…`;
}

function clampSummary(summary: string): string {
  const maxChars = getDocumentSummaryMaxChars();
  const trimmed = summary.trim();
  if (trimmed.length <= maxChars) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxChars).trimEnd()}…`;
}

function extractJsonPayload(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function parseStructuredSummary(raw: string): ParsedChunkSummary | null {
  try {
    const payload = JSON.parse(extractJsonPayload(raw)) as unknown;
    if (!payload || typeof payload !== "object") {
      return null;
    }
    const record = payload as Record<string, unknown>;
    if (typeof record.title !== "string" || typeof record.summary !== "string") {
      return null;
    }
    const title = clampTitle(record.title);
    const summary = clampSummary(record.summary);
    if (!title || !summary) {
      return null;
    }
    return { title, summary };
  } catch {
    return null;
  }
}

function parsePlainTextSummary(raw: string, chunkIndex?: number): ParsedChunkSummary {
  const trimmed = raw.trim();
  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const fallbackTitle =
    chunkIndex !== undefined
      ? `Section ${chunkIndex + 1}`
      : "Section";
  if (lines.length === 0) {
    return { title: fallbackTitle, summary: "" };
  }
  const firstLine = lines[0] ?? fallbackTitle;
  const rest = lines.slice(1).join("\n").trim();
  const title = clampTitle(firstLine) || fallbackTitle;
  const summary = clampSummary(rest || trimmed);
  return { title, summary };
}

export function parseChunkSummaryResponse(
  raw: string,
  options?: { chunkIndex?: number },
): ParsedChunkSummary | null {
  const structured = parseStructuredSummary(raw);
  if (structured) {
    return structured;
  }
  const plain = parsePlainTextSummary(raw, options?.chunkIndex);
  if (!plain.summary) {
    return null;
  }
  return plain;
}
