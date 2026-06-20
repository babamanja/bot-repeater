import { getDocumentChunkTitleMaxChars, getDocumentSummaryMaxChars, } from "../config/documentProcessing.js";
function clampTitle(title) {
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
function clampSummary(summary) {
    const maxChars = getDocumentSummaryMaxChars();
    const trimmed = summary.trim();
    if (trimmed.length <= maxChars) {
        return trimmed;
    }
    return `${trimmed.slice(0, maxChars).trimEnd()}…`;
}
function extractJsonPayload(raw) {
    const trimmed = raw.trim();
    const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
    return fenced ? fenced[1].trim() : trimmed;
}
function parseStructuredSummary(raw) {
    try {
        const payload = JSON.parse(extractJsonPayload(raw));
        if (!payload || typeof payload !== "object") {
            return null;
        }
        const record = payload;
        if (typeof record.title !== "string" || typeof record.summary !== "string") {
            return null;
        }
        const title = clampTitle(record.title);
        const summary = clampSummary(record.summary);
        if (!title || !summary) {
            return null;
        }
        return { title, summary };
    }
    catch {
        return null;
    }
}
function parsePlainTextSummary(raw, chunkIndex) {
    const trimmed = raw.trim();
    const lines = trimmed
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    const fallbackTitle = chunkIndex !== undefined
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
export function parseChunkSummaryResponse(raw, options) {
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
