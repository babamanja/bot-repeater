import { getPrisma } from "./prisma.js";

export type TagRow = {
  id: number;
  name: string;
  parentId: number | null;
  createdAt: Date;
  parentName: string | null;
  childCount: number;
  vocabPairCount: number;
};

export async function selectAllTags(): Promise<TagRow[]> {
  const rows = await getPrisma().tag.findMany({
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      parentId: true,
      createdAt: true,
      parent: { select: { name: true } },
      _count: { select: { children: true, vocabPairs: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    parentId: row.parentId,
    createdAt: row.createdAt,
    parentName: row.parent?.name ?? null,
    childCount: row._count.children,
    vocabPairCount: row._count.vocabPairs,
  }));
}

export async function selectTagById(tagId: number) {
  return getPrisma().tag.findUnique({
    where: { id: tagId },
    select: {
      id: true,
      name: true,
      parentId: true,
      createdAt: true,
      parent: { select: { name: true } },
      _count: { select: { children: true, vocabPairs: true } },
    },
  });
}

export async function selectTagParentChain(tagId: number): Promise<number[]> {
  const chain: number[] = [];
  let currentId: number | null = tagId;

  while (currentId != null) {
    const row: { parentId: number | null } | null = await getPrisma().tag.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    if (!row?.parentId) {
      break;
    }
    chain.push(row.parentId);
    currentId = row.parentId;
  }

  return chain;
}

export async function insertTag(input: { name: string; parentId: number | null }) {
  return getPrisma().tag.create({
    data: {
      name: input.name,
      parentId: input.parentId,
    },
    select: {
      id: true,
      name: true,
      parentId: true,
      createdAt: true,
      parent: { select: { name: true } },
      _count: { select: { children: true, vocabPairs: true } },
    },
  });
}

export async function updateTagById(
  tagId: number,
  input: { name?: string; parentId?: number | null },
) {
  return getPrisma().tag.update({
    where: { id: tagId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
    },
    select: {
      id: true,
      name: true,
      parentId: true,
      createdAt: true,
      parent: { select: { name: true } },
      _count: { select: { children: true, vocabPairs: true } },
    },
  });
}

export async function deleteTagById(tagId: number) {
  await getPrisma().tag.delete({ where: { id: tagId } });
}

export async function isTagNameTaken(name: string, excludeTagId?: number) {
  const existing = await getPrisma().tag.findUnique({
    where: { name },
    select: { id: true },
  });
  if (!existing) {
    return false;
  }
  return excludeTagId == null || existing.id !== excludeTagId;
}

export async function countExistingTagsByIds(tagIds: number[]) {
  if (tagIds.length === 0) {
    return 0;
  }
  return getPrisma().tag.count({
    where: { id: { in: tagIds } },
  });
}
