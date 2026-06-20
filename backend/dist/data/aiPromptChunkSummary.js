import { getDocumentChunkTitleMaxChars, getDocumentSummaryMaxChars, } from "../config/documentProcessing.js";
import { getChunkSummaryPromptTemplate } from "./chunkSummaryPromptTemplateStore.js";
export function buildPromptChunkSummary(text, options) {
    const language = options?.language?.trim() || "the same language as the source text";
    const maxChars = options?.maxChars ?? getDocumentSummaryMaxChars();
    const titleMaxChars = options?.titleMaxChars ?? getDocumentChunkTitleMaxChars();
    return getChunkSummaryPromptTemplate()
        .replaceAll("{{language}}", language)
        .replaceAll("{{maxChars}}", String(maxChars))
        .replaceAll("{{titleMaxChars}}", String(titleMaxChars))
        .replaceAll("{{text}}", text);
}
