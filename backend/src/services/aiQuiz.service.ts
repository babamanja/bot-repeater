import { randomUUID } from "node:crypto";
import { FullQuizDto } from "./dto/quizDto.js";
import { buildPromptGenerate } from "../data/aiPromptGenerate.js";
import { isUuid } from "../utils/uuid.js";
import { isArray, isObject, isString, isType } from "../utils/typecheck.js";
import {
  extractOpenAiResponseText,
  getOpenAiApiKey,
  getOpenAiModel,
  parseOpenAiUsage,
  type OpenAiResponsesApiResponse,
} from "./openaiResponseText.js";
import { shuffleArray } from "../utils/shuffle.js";

type RawQuizDto = {
  title: string;
  questions: Array<{
    id: string;
    prompt: string;
    correctAnswerIds: Array<string | number>;
    options: Array<{
      answerId: string | number;
      text: string;
    }>;
  }>;
};

function isRawQuizDto(input: unknown): input is RawQuizDto {
  if (!input || typeof input !== "object") return false;
  const obj = input as RawQuizDto;
  if (!isString(obj.title) || !isArray(obj.questions)) return false;
  return obj.questions.every((q) => {
    if (!q || !isObject(q)) return false;
    if (
      !isString(q.id) ||
      !isString(q.prompt) ||
      !isArray(q.correctAnswerIds) ||
      !isArray(q.options) ||
      q.options.length !== 4
    ) {
      return false;
    }
    const optionIds = new Set<string>();
    for (const option of q.options) {
      if (
        !isObject(option) ||
        !isType(option.answerId, ["string", "number"]) ||
        !isString(option.text)
      ) {
        return false;
      }
      optionIds.add(String(option.answerId));
    }
    if (optionIds.size !== 4) {
      return false;
    }
    return q.correctAnswerIds.every(
      (id) => isType(id, ["string", "number"]) && optionIds.has(String(id)),
    );
  });
}

function ensureUuid(value: string): string {
  return isUuid(value) ? value : randomUUID();
}

function normalizeQuizIds(raw: RawQuizDto): FullQuizDto {
  return {
    title: raw.title,
    questions: raw.questions.map((question) => {
      const optionIdMap = new Map<string, string>();
      const normalizedOptions = question.options.map((option) => {
        const sourceId = String(option.answerId);
        const normalizedId = ensureUuid(sourceId);
        optionIdMap.set(sourceId, normalizedId);
        return {
          answerId: normalizedId,
          text: option.text,
        };
      });

      const correctAnswerIds = question.correctAnswerIds
        .map((id) => optionIdMap.get(String(id)))
        .filter((id): id is string => isString(id));

      return {
        id: ensureUuid(String(question.id)),
        prompt: question.prompt,
        correctAnswerIds,
        options: shuffleArray(normalizedOptions),
      };
    }),
  };
}

export async function buildQuizWithAi(
  text: string,
  language: string = "english",
  count: number = 10,
): Promise<
  | {
      ok: true;
      quiz: FullQuizDto;
      model: string | null;
      usage: {
        inputTokens: number | null;
        outputTokens: number | null;
        totalTokens: number | null;
      };
    }
  | {
      ok: false;
      error: string;
      model: string | null;
      usage: {
        inputTokens: number | null;
        outputTokens: number | null;
        totalTokens: number | null;
      };
    }
> {
  const apiKey = getOpenAiApiKey();
  const prompt = buildPromptGenerate(text, language, count);
  if (!apiKey) {
    return {
      ok: false,
      error: "OPENAI_API_KEY is not configured",
      model: null,
      usage: {
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
      },
    };
  }

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
            "You generate quizzes and must return strictly valid JSON only. No extra text.",
        },
        { role: "user", content: prompt },
      ],
      text: {
        format: {
          type: "json_object",
        },
      },
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      ok: false,
      error: `OpenAI request failed (${response.status}): ${errorText.slice(0, 600)}`,
      model: null,
      usage: {
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
      },
    };
  }

  const payload = (await response.json()) as OpenAiResponsesApiResponse;
  const usage = parseOpenAiUsage(payload);
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
      usage,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    return {
      ok: false,
      error: "OpenAI returned non-JSON content",
      model,
      usage,
    };
  }

  if (!isRawQuizDto(parsed)) {
    return {
      ok: false,
      error: "OpenAI returned invalid quiz schema",
      model,
      usage,
    };
  }

  return { ok: true, quiz: normalizeQuizIds(parsed), model, usage };
}
