import { getPrisma } from "./prisma.js";

export type LanguageRow = {
  id: number;
  name: string;
};

export type AdminLanguageRow = LanguageRow & {
  vocabWordCount: number;
  primaryUserCount: number;
  learningUserCount: number;
};

export async function listLanguages(): Promise<LanguageRow[]> {
  const rows = await getPrisma().language.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return rows;
}

export async function findLanguagesByIds(ids: number[]): Promise<LanguageRow[]> {
  if (ids.length === 0) {
    return [];
  }
  return getPrisma().language.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });
}

export async function selectAllLanguages(): Promise<AdminLanguageRow[]> {
  const rows = await getPrisma().language.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          vocabWords: true,
          primaryUsers: true,
          learningUsers: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    vocabWordCount: row._count.vocabWords,
    primaryUserCount: row._count.primaryUsers,
    learningUserCount: row._count.learningUsers,
  }));
}

export async function selectLanguageById(languageId: number) {
  return getPrisma().language.findUnique({
    where: { id: languageId },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          vocabWords: true,
          primaryUsers: true,
          learningUsers: true,
        },
      },
    },
  });
}

export async function insertLanguage(name: string) {
  return getPrisma().language.create({
    data: { name },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          vocabWords: true,
          primaryUsers: true,
          learningUsers: true,
        },
      },
    },
  });
}

export async function updateLanguageById(languageId: number, name: string) {
  return getPrisma().language.update({
    where: { id: languageId },
    data: { name },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          vocabWords: true,
          primaryUsers: true,
          learningUsers: true,
        },
      },
    },
  });
}

export async function deleteLanguageById(languageId: number) {
  await getPrisma().language.delete({ where: { id: languageId } });
}

export async function isLanguageNameTaken(name: string, excludeLanguageId?: number) {
  const existing = await getPrisma().language.findUnique({
    where: { name },
    select: { id: true },
  });
  if (!existing) {
    return false;
  }
  return excludeLanguageId == null || existing.id !== excludeLanguageId;
}
