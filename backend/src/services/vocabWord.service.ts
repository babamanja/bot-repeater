import * as languageRepository from "../db/languageRepository.js";
import * as vocabWordRepository from "../db/vocabWordRepository.js";

const MAX_WORD_TEXT_LENGTH = 200;

function mapVocabWordRow(row: {
  id: number;
  text: string;
  languageId: number;
  language: { name: string };
  _count: { pairsAsWordA: number; pairsAsWordB: number };
}) {
  return {
    id: row.id,
    text: row.text,
    languageId: row.languageId,
    languageName: row.language.name,
    primaryPairCount: row._count.pairsAsWordA,
    learningPairCount: row._count.pairsAsWordB,
  };
}

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

export async function createVocabWord(input: { text: unknown; languageId: unknown }) {
  const text = normalizeWordText(input.text);
  if (!text) {
    return { ok: false as const, status: 400, error: "word text is required" };
  }

  const languageId = parseLanguageId(input.languageId);
  if (!languageId) {
    return { ok: false as const, status: 400, error: "invalid language id" };
  }

  const language = await languageRepository.selectLanguageById(languageId);
  if (!language) {
    return { ok: false as const, status: 404, error: "language not found" };
  }

  if (await vocabWordRepository.isVocabWordTextTaken(languageId, text)) {
    return { ok: false as const, status: 409, error: "word already exists for language" };
  }

  const row = await vocabWordRepository.insertVocabWord({ languageId, text });
  return { ok: true as const, word: mapVocabWordRow(row) };
}

export async function updateVocabWord(
  wordId: number,
  input: { text?: unknown; languageId?: unknown },
) {
  if (!Number.isInteger(wordId) || wordId < 1) {
    return { ok: false as const, status: 400, error: "invalid word id" };
  }

  const existing = await vocabWordRepository.selectVocabWordById(wordId);
  if (!existing) {
    return { ok: false as const, status: 404, error: "word not found" };
  }

  const text = input.text !== undefined ? normalizeWordText(input.text) : undefined;
  if (input.text !== undefined && !text) {
    return { ok: false as const, status: 400, error: "word text is required" };
  }

  const languageId =
    input.languageId !== undefined ? parseLanguageId(input.languageId) : undefined;
  if (input.languageId !== undefined && !languageId) {
    return { ok: false as const, status: 400, error: "invalid language id" };
  }

  const pairCount = existing._count.pairsAsWordA + existing._count.pairsAsWordB;
  if (
    languageId != null &&
    languageId !== existing.languageId &&
    pairCount > 0
  ) {
    return {
      ok: false as const,
      status: 409,
      error: "cannot change language while word is used in pairs",
    };
  }

  if (languageId != null && languageId !== existing.languageId) {
    const language = await languageRepository.selectLanguageById(languageId);
    if (!language) {
      return { ok: false as const, status: 404, error: "language not found" };
    }
  }

  const nextLanguageId = languageId ?? existing.languageId;
  const nextText = text ?? existing.text;
  if (await vocabWordRepository.isVocabWordTextTaken(nextLanguageId, nextText, wordId)) {
    return { ok: false as const, status: 409, error: "word already exists for language" };
  }

  const updateData: { text?: string; languageId?: number } = {};
  if (typeof text === "string") {
    updateData.text = text;
  }
  if (typeof languageId === "number") {
    updateData.languageId = languageId;
  }

  const row = await vocabWordRepository.updateVocabWordById(wordId, updateData);
  return { ok: true as const, word: mapVocabWordRow(row) };
}

export async function deleteVocabWord(wordId: number) {
  if (!Number.isInteger(wordId) || wordId < 1) {
    return { ok: false as const, status: 400, error: "invalid word id" };
  }

  const existing = await vocabWordRepository.selectVocabWordById(wordId);
  if (!existing) {
    return { ok: false as const, status: 404, error: "word not found" };
  }

  const pairCount = existing._count.pairsAsWordA + existing._count.pairsAsWordB;
  if (pairCount > 0) {
    return {
      ok: false as const,
      status: 409,
      error: "word is used in dictionary pairs",
    };
  }

  await vocabWordRepository.deleteVocabWordById(wordId);
  return { ok: true as const };
}
