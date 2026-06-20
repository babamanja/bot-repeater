import { isString } from "../utils/typecheck.js";
export function extractOpenAiResponseText(payload) {
    const directText = payload.output_text?.trim();
    if (directText) {
        return directText;
    }
    const chunks = payload.output ?? [];
    for (const chunk of chunks) {
        const parts = chunk.content ?? [];
        for (const part of parts) {
            if (part.type === "output_text" && isString(part.text)) {
                const normalized = part.text.trim();
                if (normalized) {
                    return normalized;
                }
            }
        }
    }
    return "";
}
export function parseOpenAiUsage(payload) {
    return {
        inputTokens: Number.isInteger(payload.usage?.input_tokens)
            ? (payload.usage?.input_tokens ?? null)
            : null,
        outputTokens: Number.isInteger(payload.usage?.output_tokens)
            ? (payload.usage?.output_tokens ?? null)
            : null,
        totalTokens: Number.isInteger(payload.usage?.total_tokens)
            ? (payload.usage?.total_tokens ?? null)
            : null,
    };
}
export function getOpenAiApiKey() {
    return process.env.OPENAI_API_KEY?.trim() ?? "";
}
export function getOpenAiModel() {
    return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}
