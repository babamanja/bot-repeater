import * as languageRepository from "../db/languageRepository.js";
import * as tagRepository from "../db/tagRepository.js";
import * as vocabPairRepository from "../db/vocabPairRepository.js";
import * as vocabWordRepository from "../db/vocabWordRepository.js";

const MAX_WORD_TEXT_LENGTH = 200;

function normalizeWordText(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  const text = raw.trim();
  if (!text || text.length > MAX_WORD_TEXT_LENGTH) {
    return null;
  }
  return text;
}

function parseLanguageId(raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 1) {
    return null;
  }
  return raw;
}

function parseTagIds(
  raw: unknown,
): { ok: true; tagIds: number[] } | { ok: false; status: number; error: string } {
  if (raw === undefined || raw === null) {
    return { ok: true, tagIds: [] };
  }
  if (!Array.isArray(raw)) {
    return { ok: false, status: 400, error: "invalid tag ids" };
  }

  const tagIds: number[] = [];
  for (const item of raw) {
    if (typeof item !== "number" || !Number.isInteger(item) || item < 1) {
      return { ok: false, status: 400, error: "invalid tag ids" };
    }
    if (!tagIds.includes(item)) {
      tagIds.push(item);
    }
  }

  return { ok: true, tagIds };
}

async function validateTagIds(
  tagIds: number[],
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (tagIds.length === 0) {
    return { ok: true };
  }

  const existingCount = await tagRepository.countExistingTagsByIds(tagIds);
  if (existingCount !== tagIds.length) {
    return { ok: false, status: 404, error: "tag not found" };
  }

  return { ok: true };
}

async function applyTranslationTags(translationId: number, tagIds: number[]) {
  const row = await vocabPairRepository.replaceTranslationTags(translationId, tagIds);
  if (!row) {
    return null;
  }
  return vocabPairRepository.mapTranslationRow(row);
}

type TranslationWordInput = {
  primaryLanguageId: unknown;
  primaryText: unknown;
  learningLanguageId: unknown;
  learningText: unknown;
  tagIds?: unknown;
};

async function resolveTranslationWords(input: TranslationWordInput) {
  const primaryText = normalizeWordText(input.primaryText);
  const learningText = normalizeWordText(input.learningText);
  if (!primaryText || !learningText) {
    return { ok: false as const, status: 400, error: "word text is required" };
  }

  const primaryLanguageId = parseLanguageId(input.primaryLanguageId);
  const learningLanguageId = parseLanguageId(input.learningLanguageId);
  if (!primaryLanguageId || !learningLanguageId) {
    return { ok: false as const, status: 400, error: "invalid language id" };
  }

  if (primaryLanguageId === learningLanguageId) {
    return {
      ok: false as const,
      status: 400,
      error: "primary and learning language must differ",
    };
  }

  const parsedTags = parseTagIds(input.tagIds);
  if (parsedTags.ok === false) {
    return parsedTags;
  }

  const tagCheck = await validateTagIds(parsedTags.tagIds);
  if (tagCheck.ok === false) {
    return tagCheck;
  }

  const [primaryLanguage, learningLanguage] = await Promise.all([
    languageRepository.selectLanguageById(primaryLanguageId),
    languageRepository.selectLanguageById(learningLanguageId),
  ]);
  if (!primaryLanguage || !learningLanguage) {
    return { ok: false as const, status: 404, error: "language not found" };
  }

  const primaryWord = await vocabWordRepository.upsertVocabWord(
    primaryLanguageId,
    primaryText,
  );
  const learningWord = await vocabWordRepository.upsertVocabWord(
    learningLanguageId,
    learningText,
  );

  if (primaryWord.id === learningWord.id) {
    return {
      ok: false as const,
      status: 400,
      error: "primary and learning word must differ",
    };
  }

  return {
    ok: true as const,
    primaryWordId: primaryWord.id,
    learningWordId: learningWord.id,
    primaryLanguageId,
    learningLanguageId,
    tagIds: parsedTags.tagIds,
  };
}

export async function createTranslation(input: TranslationWordInput) {
  const resolved = await resolveTranslationWords(input);
  if (resolved.ok === false) {
    return resolved;
  }

  const existing = await vocabPairRepository.findTranslationByWordIds(
    resolved.primaryWordId,
    resolved.learningWordId,
  );
  if (existing) {
    return {
      ok: false as const,
      status: 409,
      error: "translation pair already exists",
    };
  }

  const row = await vocabPairRepository.insertTranslation({
    wordIdOne: resolved.primaryWordId,
    wordIdTwo: resolved.learningWordId,
    primaryLanguageId: resolved.primaryLanguageId,
    learningLanguageId: resolved.learningLanguageId,
  });

  const translation = await applyTranslationTags(row.id, resolved.tagIds);
  if (!translation) {
    return { ok: false as const, status: 404, error: "translation not found" };
  }

  return {
    ok: true as const,
    translation,
  };
}

export async function deleteTranslation(translationId: number) {
  if (!Number.isInteger(translationId) || translationId < 1) {
    return { ok: false as const, status: 400, error: "invalid translation id" };
  }

  const existing = await vocabPairRepository.selectTranslationById(translationId);
  if (!existing) {
    return { ok: false as const, status: 404, error: "translation not found" };
  }

  if (existing._count.dictionaryEntries > 0) {
    return {
      ok: false as const,
      status: 409,
      error: "translation is used by users",
    };
  }

  await vocabPairRepository.deleteTranslationById(translationId);
  return { ok: true as const };
}

export async function updateTranslation(translationId: number, input: TranslationWordInput) {
  if (!Number.isInteger(translationId) || translationId < 1) {
    return { ok: false as const, status: 400, error: "invalid translation id" };
  }

  const existing = await vocabPairRepository.selectTranslationById(translationId);
  if (!existing) {
    return { ok: false as const, status: 404, error: "translation not found" };
  }

  const resolved = await resolveTranslationWords(input);
  if (resolved.ok === false) {
    return resolved;
  }

  const duplicate = await vocabPairRepository.findTranslationByWordIds(
    resolved.primaryWordId,
    resolved.learningWordId,
  );
  if (duplicate && duplicate.id !== translationId) {
    return {
      ok: false as const,
      status: 409,
      error: "translation pair already exists",
    };
  }

  await vocabPairRepository.updateTranslationWordIds(translationId, {
    wordIdOne: resolved.primaryWordId,
    wordIdTwo: resolved.learningWordId,
    primaryLanguageId: resolved.primaryLanguageId,
    learningLanguageId: resolved.learningLanguageId,
  });

  const translation = await applyTranslationTags(translationId, resolved.tagIds);
  if (!translation) {
    return { ok: false as const, status: 404, error: "translation not found" };
  }

  return {
    ok: true as const,
    translation,
  };
}

export async function getTranslation(translationId: number) {
  if (!Number.isInteger(translationId) || translationId < 1) {
    return { ok: false as const, status: 400, error: "invalid translation id" };
  }

  const row = await vocabPairRepository.selectTranslationById(translationId);
  if (!row) {
    return { ok: false as const, status: 404, error: "translation not found" };
  }

  return {
    ok: true as const,
    translation: vocabPairRepository.mapTranslationRow(row),
  };
}
