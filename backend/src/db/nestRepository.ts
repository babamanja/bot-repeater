import { getPrisma } from "./prisma.js";

export type NestMemberRow = {
  wordId: number;
  text: string;
};

export async function createNest(languageId: number): Promise<number> {
  const nest = await getPrisma().lexicalNest.create({
    data: { languageId },
    select: { id: true },
  });
  return nest.id;
}

export async function mergeNests(targetNestId: number, sourceNestId: number): Promise<void> {
  if (targetNestId === sourceNestId) {
    return;
  }
  await getPrisma().$transaction(async (tx) => {
    await tx.vocabWord.updateMany({
      where: { nestId: sourceNestId },
      data: { nestId: targetNestId },
    });
    await tx.lexicalNest.delete({ where: { id: sourceNestId } });
  });
}

export async function selectNestIdForWord(wordId: number): Promise<number | null> {
  const word = await getPrisma().vocabWord.findUnique({
    where: { id: wordId },
    select: { nestId: true },
  });
  return word?.nestId ?? null;
}

export async function selectNestMembers(nestId: number): Promise<NestMemberRow[]> {
  const members = await getPrisma().vocabWord.findMany({
    where: { nestId },
    select: { id: true, text: true },
    orderBy: { text: "asc" },
  });
  return members.map((member) => ({ wordId: member.id, text: member.text }));
}

export async function selectNestMembersForWordIds(
  wordIds: number[],
): Promise<Map<number, NestMemberRow[]>> {
  const uniqueWordIds = [...new Set(wordIds)];
  const result = new Map<number, NestMemberRow[]>();
  for (const wordId of uniqueWordIds) {
    result.set(wordId, []);
  }
  if (uniqueWordIds.length === 0) {
    return result;
  }

  const words = await getPrisma().vocabWord.findMany({
    where: { id: { in: uniqueWordIds } },
    select: { id: true, nestId: true },
  });

  const nestIds = [...new Set(words.map((word) => word.nestId))];
  const members = await getPrisma().vocabWord.findMany({
    where: { nestId: { in: nestIds } },
    select: { id: true, text: true, nestId: true },
    orderBy: { text: "asc" },
  });

  const membersByNest = new Map<number, NestMemberRow[]>();
  for (const nestId of nestIds) {
    membersByNest.set(nestId, []);
  }
  for (const member of members) {
    membersByNest.get(member.nestId)!.push({ wordId: member.id, text: member.text });
  }

  for (const word of words) {
    result.set(word.id, membersByNest.get(word.nestId) ?? []);
  }

  return result;
}

export async function addMemberToNest(
  nestId: number,
  languageId: number,
  text: string,
): Promise<{ wordId: number; text: string; merged: boolean }> {
  const trimmed = text.trim();
  const prisma = getPrisma();
  const existing = await prisma.vocabWord.findUnique({
    where: { languageId_text: { languageId, text: trimmed } },
    select: { id: true, text: true, nestId: true },
  });

  if (existing) {
    if (existing.nestId === nestId) {
      return { wordId: existing.id, text: existing.text, merged: false };
    }
    await mergeNests(nestId, existing.nestId);
    return { wordId: existing.id, text: existing.text, merged: true };
  }

  const word = await prisma.vocabWord.create({
    data: {
      languageId,
      text: trimmed,
      nestId,
    },
    select: { id: true, text: true },
  });
  return { wordId: word.id, text: word.text, merged: false };
}

export async function removeNestMember(wordId: number, nestId: number): Promise<boolean> {
  const prisma = getPrisma();
  const word = await prisma.vocabWord.findUnique({
    where: { id: wordId },
    select: {
      id: true,
      nestId: true,
      _count: {
        select: {
          pairsAsWordA: true,
          pairsAsWordB: true,
        },
      },
    },
  });

  if (!word || word.nestId !== nestId) {
    return false;
  }

  const memberCount = await prisma.vocabWord.count({ where: { nestId } });
  if (memberCount <= 1) {
    return false;
  }

  const pairCount = word._count.pairsAsWordA + word._count.pairsAsWordB;
  if (pairCount > 0) {
    return false;
  }

  await prisma.vocabWord.delete({ where: { id: wordId } });
  return true;
}

export async function ensureVocabWordWithNest(
  languageId: number,
  text: string,
): Promise<{ id: number; text: string; nestId: number }> {
  const prisma = getPrisma();
  const existing = await prisma.vocabWord.findUnique({
    where: { languageId_text: { languageId, text } },
    select: { id: true, text: true, nestId: true },
  });
  if (existing) {
    return existing;
  }

  return prisma.$transaction(async (tx) => {
    const nest = await tx.lexicalNest.create({
      data: { languageId },
      select: { id: true },
    });
    const word = await tx.vocabWord.create({
      data: {
        languageId,
        text,
        nestId: nest.id,
      },
      select: { id: true, text: true, nestId: true },
    });
    return word;
  });
}
