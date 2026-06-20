import { buildPromptChunkSummary } from "../data/aiPromptChunkSummary.js";
import { parseChunkSummaryResponse } from "./chunkSummaryResponse.js";
import {
  extractOpenAiResponseText,
  getOpenAiApiKey,
  getOpenAiModel,
  parseOpenAiUsage,
  type OpenAiResponsesApiResponse,
  type OpenAiUsage,
} from "./openaiResponseText.js";

export async function summarizeChunkWithAi(
  text: string,
  options?: { language?: string; chunkIndex?: number },
): Promise<
  | {
      ok: true;
      title: string;
      summary: string;
      model: string | null;
      usage: OpenAiUsage;
    }
  | { ok: false; error: string; model: string | null; usage: OpenAiUsage }
> {
  const apiKey = getOpenAiApiKey();
  const usage: OpenAiUsage = {
    inputTokens: null,
    outputTokens: null,
    totalTokens: null,
  };

  if (!text.trim()) {
    return { ok: false, error: "chunk text is empty", model: null, usage };
  }

  if (!apiKey) {
    return {
      ok: false,
      error: "OPENAI_API_KEY is not configured",
      model: null,
      usage,
    };
  }

  const prompt = buildPromptChunkSummary(text, { language: options?.language });

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getOpenAiModel(),
      input: [
        {
          role: "system",
          content:
            'You summarize source material. Return only a JSON object with "title" and "summary" keys, with no extra commentary.',
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      ok: false,
      error: `OpenAI request failed (${response.status}): ${errorText.slice(0, 600)}`,
      model: null,
      usage,
    };
  }

  const payload = (await response.json()) as OpenAiResponsesApiResponse;
  const parsedUsage = parseOpenAiUsage(payload);
  const model =
    typeof payload.model === "string" && payload.model.trim().length > 0
      ? payload.model.trim()
      : null;
  const rawContent = extractOpenAiResponseText(payload);
  if (!rawContent) {
    return {
      ok: false,
      error: `OpenAI returned empty content: ${JSON.stringify(payload).slice(0, 600)}`,
      model,
      usage: parsedUsage,
    };
  }

  const parsed = parseChunkSummaryResponse(rawContent, {
    chunkIndex: options?.chunkIndex,
  });
  if (!parsed) {
    return {
      ok: false,
      error: "OpenAI returned an invalid chunk summary payload",
      model,
      usage: parsedUsage,
    };
  }

  return {
    ok: true,
    title: parsed.title,
    summary: parsed.summary,
    model,
    usage: parsedUsage,
  };
}
