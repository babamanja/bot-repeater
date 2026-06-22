import * as tagRepository from "../db/tagRepository.js";

const MAX_TAG_NAME_LENGTH = 100;

function mapTagRow(row: {
  id: number;
  name: string;
  parentId: number | null;
  createdAt: Date;
  parent: { name: string } | null;
  _count: { children: number; vocabPairs: number };
}) {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parentId,
    parentName: row.parent?.name ?? null,
    createdAt: row.createdAt.toISOString(),
    childCount: row._count.children,
    vocabPairCount: row._count.vocabPairs,
  };
}

function normalizeTagName(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  const name = raw.trim();
  if (!name || name.length > MAX_TAG_NAME_LENGTH) {
    return null;
  }
  return name;
}

function parseParentId(raw: unknown): number | null | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (raw === null) {
    return null;
  }
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 1) {
    return null;
  }
  return raw;
}

async function validateParentId(
  parentId: number | null,
  tagId?: number,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (parentId == null) {
    return { ok: true };
  }

  if (tagId != null && parentId === tagId) {
    return { ok: false, status: 400, error: "tag cannot be its own parent" };
  }

  const parent = await tagRepository.selectTagById(parentId);
  if (!parent) {
    return { ok: false, status: 404, error: "parent tag not found" };
  }

  if (tagId != null) {
    const ancestors = await tagRepository.selectTagParentChain(tagId);
    if (ancestors.includes(parentId)) {
      return { ok: false, status: 400, error: "cyclic tag hierarchy" };
    }
  }

  return { ok: true };
}

export async function listTags() {
  const rows = await tagRepository.selectAllTags();
  return {
    ok: true as const,
    tags: rows.map((row) => ({
      id: row.id,
      name: row.name,
      parentId: row.parentId,
      parentName: row.parentName,
      createdAt: row.createdAt.toISOString(),
      childCount: row.childCount,
      vocabPairCount: row.vocabPairCount,
    })),
  };
}

export async function createTag(input: { name: unknown; parentId?: unknown }) {
  const name = normalizeTagName(input.name);
  if (!name) {
    return { ok: false as const, status: 400, error: "tag name is required" };
  }

  const parentId = parseParentId(input.parentId ?? null);
  if (parentId === null && input.parentId != null && input.parentId !== null) {
    return { ok: false as const, status: 400, error: "invalid parent tag id" };
  }

  const parentCheck = await validateParentId(parentId ?? null);
  if (parentCheck.ok === false) {
    return parentCheck;
  }

  if (await tagRepository.isTagNameTaken(name)) {
    return { ok: false as const, status: 409, error: "tag name already exists" };
  }

  const row = await tagRepository.insertTag({ name, parentId: parentId ?? null });
  return { ok: true as const, tag: mapTagRow(row) };
}

export async function updateTag(
  tagId: number,
  input: { name?: unknown; parentId?: unknown },
) {
  if (!Number.isInteger(tagId) || tagId < 1) {
    return { ok: false as const, status: 400, error: "invalid tag id" };
  }

  const existing = await tagRepository.selectTagById(tagId);
  if (!existing) {
    return { ok: false as const, status: 404, error: "tag not found" };
  }

  const name =
    input.name !== undefined ? normalizeTagName(input.name) : undefined;
  if (input.name !== undefined && !name) {
    return { ok: false as const, status: 400, error: "tag name is required" };
  }

  const parentId = parseParentId(input.parentId);
  if (input.parentId !== undefined && parentId === null && input.parentId !== null) {
    return { ok: false as const, status: 400, error: "invalid parent tag id" };
  }

  if (input.parentId !== undefined) {
    const parentCheck = await validateParentId(parentId ?? null, tagId);
    if (parentCheck.ok === false) {
      return parentCheck;
    }
  }

  if (name && (await tagRepository.isTagNameTaken(name, tagId))) {
    return { ok: false as const, status: 409, error: "tag name already exists" };
  }

  const row = await tagRepository.updateTagById(tagId, {
    ...(typeof name === "string" ? { name } : {}),
    ...(input.parentId !== undefined ? { parentId: parentId ?? null } : {}),
  });
  return { ok: true as const, tag: mapTagRow(row) };
}

export async function deleteTag(tagId: number) {
  if (!Number.isInteger(tagId) || tagId < 1) {
    return { ok: false as const, status: 400, error: "invalid tag id" };
  }

  const existing = await tagRepository.selectTagById(tagId);
  if (!existing) {
    return { ok: false as const, status: 404, error: "tag not found" };
  }

  await tagRepository.deleteTagById(tagId);
  return { ok: true as const };
}
