import * as languageRepository from "../db/languageRepository.js";

const MAX_LANGUAGE_NAME_LENGTH = 100;

function mapLanguageRow(row: {
  id: number;
  name: string;
  _count: { vocabWords: number; primaryUsers: number; learningUsers: number };
}) {
  return {
    id: row.id,
    name: row.name,
    vocabWordCount: row._count.vocabWords,
    primaryUserCount: row._count.primaryUsers,
    learningUserCount: row._count.learningUsers,
  };
}

function normalizeLanguageName(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  const name = raw.trim();
  if (!name || name.length > MAX_LANGUAGE_NAME_LENGTH) {
    return null;
  }
  return name;
}

export async function listLanguages() {
  const rows = await languageRepository.selectAllLanguages();
  return {
    ok: true as const,
    languages: rows.map((row) => ({
      id: row.id,
      name: row.name,
      vocabWordCount: row.vocabWordCount,
      primaryUserCount: row.primaryUserCount,
      learningUserCount: row.learningUserCount,
    })),
  };
}

export async function createLanguage(input: { name: unknown }) {
  const name = normalizeLanguageName(input.name);
  if (!name) {
    return { ok: false as const, status: 400, error: "language name is required" };
  }

  if (await languageRepository.isLanguageNameTaken(name)) {
    return { ok: false as const, status: 409, error: "language name already exists" };
  }

  const row = await languageRepository.insertLanguage(name);
  return { ok: true as const, language: mapLanguageRow(row) };
}

export async function updateLanguage(languageId: number, input: { name?: unknown }) {
  if (!Number.isInteger(languageId) || languageId < 1) {
    return { ok: false as const, status: 400, error: "invalid language id" };
  }

  const existing = await languageRepository.selectLanguageById(languageId);
  if (!existing) {
    return { ok: false as const, status: 404, error: "language not found" };
  }

  const name =
    input.name !== undefined ? normalizeLanguageName(input.name) : undefined;
  if (input.name !== undefined && !name) {
    return { ok: false as const, status: 400, error: "language name is required" };
  }

  if (name && (await languageRepository.isLanguageNameTaken(name, languageId))) {
    return { ok: false as const, status: 409, error: "language name already exists" };
  }

  const row = await languageRepository.updateLanguageById(
    languageId,
    typeof name === "string" ? name : existing.name,
  );
  return { ok: true as const, language: mapLanguageRow(row) };
}

export async function deleteLanguage(languageId: number) {
  if (!Number.isInteger(languageId) || languageId < 1) {
    return { ok: false as const, status: 400, error: "invalid language id" };
  }

  const existing = await languageRepository.selectLanguageById(languageId);
  if (!existing) {
    return { ok: false as const, status: 404, error: "language not found" };
  }

  if (existing._count.vocabWords > 0) {
    return {
      ok: false as const,
      status: 409,
      error: "language has vocabulary words",
    };
  }

  await languageRepository.deleteLanguageById(languageId);
  return { ok: true as const };
}
