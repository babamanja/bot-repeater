import { getPrisma } from "./prisma.js";

const vocabWordSelect = {
  id: true,
  text: true,
  languageId: true,
  language: { select: { name: true } },
  _count: { select: { pairsAsWordA: true, pairsAsWordB: true } },
} as const;

export async function selectVocabWordById(wordId: number) {
  return getPrisma().vocabWord.findUnique({
    where: { id: wordId },
    select: vocabWordSelect,
  });
}

export async function insertVocabWord(input: { languageId: number; text: string }) {
  return getPrisma().vocabWord.create({
    data: {
      languageId: input.languageId,
      text: input.text,
    },
    select: vocabWordSelect,
  });
}

export async function updateVocabWordById(
  wordId: number,
  input: { text?: string; languageId?: number },
) {
  return getPrisma().vocabWord.update({
    where: { id: wordId },
    data: {
      ...(input.text !== undefined ? { text: input.text } : {}),
      ...(input.languageId !== undefined ? { languageId: input.languageId } : {}),
    },
    select: vocabWordSelect,
  });
}

export async function deleteVocabWordById(wordId: number) {
  await getPrisma().vocabWord.delete({ where: { id: wordId } });
}

export async function isVocabWordTextTaken(
  languageId: number,
  text: string,
  excludeWordId?: number,
) {
  const existing = await getPrisma().vocabWord.findUnique({
    where: { languageId_text: { languageId, text } },
    select: { id: true },
  });
  if (!existing) {
    return false;
  }
  return excludeWordId == null || existing.id !== excludeWordId;
}

export async function upsertVocabWord(languageId: number, text: string) {
  return getPrisma().vocabWord.upsert({
    where: { languageId_text: { languageId, text } },
    update: {},
    create: { languageId, text },
    select: { id: true, text: true, languageId: true },
  });
}
