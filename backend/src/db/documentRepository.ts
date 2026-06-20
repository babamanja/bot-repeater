import type {
  DocumentChunkStatus,
  DocumentSourceType,
  DocumentStatus,
} from "@prisma/client";
import { getPrisma } from "./prisma.js";

export type DocumentRow = {
  id: string;
  user_id: number;
  title: string;
  status: DocumentStatus;
  token_count: number;
  source_type: DocumentSourceType;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
};

export type DocumentChunkRow = {
  id: string;
  document_id: string;
  chunk_index: number;
  text: string;
  token_count: number;
  title: string | null;
  summary: string | null;
  status: DocumentChunkStatus;
  error_message: string | null;
};

function toDocumentRow(doc: {
  id: string;
  userId: number;
  title: string;
  status: DocumentStatus;
  tokenCount: number;
  sourceType: DocumentSourceType;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}): DocumentRow {
  return {
    id: doc.id,
    user_id: doc.userId,
    title: doc.title,
    status: doc.status,
    token_count: doc.tokenCount,
    source_type: doc.sourceType,
    error_message: doc.errorMessage,
    created_at: doc.createdAt,
    updated_at: doc.updatedAt,
  };
}

function toChunkRow(chunk: {
  id: string;
  documentId: string;
  chunkIndex: number;
  text: string;
  tokenCount: number;
  title: string | null;
  summary: string | null;
  status: DocumentChunkStatus;
  errorMessage: string | null;
}): DocumentChunkRow {
  return {
    id: chunk.id,
    document_id: chunk.documentId,
    chunk_index: chunk.chunkIndex,
    text: chunk.text,
    token_count: chunk.tokenCount,
    title: chunk.title,
    summary: chunk.summary,
    status: chunk.status,
    error_message: chunk.errorMessage,
  };
}

export async function insertDocumentWithContent(input: {
  id: string;
  userId: number;
  title: string;
  sourceType: DocumentSourceType;
  fullText: string;
  tokenCount: number;
}): Promise<DocumentRow> {
  const prisma = getPrisma();
  const doc = await prisma.document.create({
    data: {
      id: input.id,
      userId: input.userId,
      title: input.title,
      sourceType: input.sourceType,
      status: "text_extracted",
      tokenCount: input.tokenCount,
      content: {
        create: {
          fullText: input.fullText,
        },
      },
    },
  });
  return toDocumentRow(doc);
}

export async function updateDocumentStatus(
  documentId: string,
  status: DocumentStatus,
  patch?: { tokenCount?: number; errorMessage?: string | null },
): Promise<void> {
  await getPrisma().document.update({
    where: { id: documentId },
    data: {
      status,
      ...(patch?.tokenCount !== undefined ? { tokenCount: patch.tokenCount } : {}),
      ...(patch?.errorMessage !== undefined ? { errorMessage: patch.errorMessage } : {}),
    },
  });
}

export async function replaceDocumentChunks(
  documentId: string,
  chunks: Array<{
    id: string;
    chunkIndex: number;
    text: string;
    tokenCount: number;
    title?: string | null;
    summary: string | null;
    status: DocumentChunkStatus;
    errorMessage?: string | null;
    aiInputTokens?: number | null;
    aiOutputTokens?: number | null;
    aiTotalTokens?: number | null;
    aiModel?: string | null;
  }>,
): Promise<void> {
  const prisma = getPrisma();
  const hasReadyChunk = chunks.some((chunk) => chunk.status === "summarized");
  await prisma.$transaction([
    prisma.documentChunk.deleteMany({ where: { documentId } }),
    prisma.documentChunk.createMany({
      data: chunks.map((chunk) => ({
        id: chunk.id,
        documentId,
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
        tokenCount: chunk.tokenCount,
        title: chunk.title ?? null,
        summary: chunk.summary,
        status: chunk.status,
        errorMessage: chunk.errorMessage ?? null,
        aiInputTokens: chunk.aiInputTokens ?? null,
        aiOutputTokens: chunk.aiOutputTokens ?? null,
        aiTotalTokens: chunk.aiTotalTokens ?? null,
        aiModel: chunk.aiModel ?? null,
      })),
    }),
    prisma.document.update({
      where: { id: documentId },
      data: { status: hasReadyChunk ? "summarized" : "failed" },
    }),
  ]);
}

export async function markDocumentFailed(
  documentId: string,
  errorMessage: string,
): Promise<void> {
  await getPrisma().document.update({
    where: { id: documentId },
    data: {
      status: "failed",
      errorMessage,
    },
  });
}

export async function selectDocumentByIdForUser(
  documentId: string,
  userId: number,
): Promise<DocumentRow | null> {
  const doc = await getPrisma().document.findFirst({
    where: { id: documentId, userId },
  });
  return doc ? toDocumentRow(doc) : null;
}

export async function selectDocumentContent(
  documentId: string,
): Promise<string | null> {
  const row = await getPrisma().documentContent.findUnique({
    where: { documentId },
    select: { fullText: true },
  });
  return row?.fullText ?? null;
}

export async function selectDocumentChunks(
  documentId: string,
): Promise<DocumentChunkRow[]> {
  const rows = await getPrisma().documentChunk.findMany({
    where: { documentId },
    orderBy: { chunkIndex: "asc" },
  });
  return rows.map(toChunkRow);
}

export async function selectDocumentChunkById(
  chunkId: string,
): Promise<(DocumentChunkRow & { user_id: number }) | null> {
  const row = await getPrisma().documentChunk.findUnique({
    where: { id: chunkId },
    include: {
      document: { select: { userId: true } },
    },
  });
  if (!row) {
    return null;
  }
  return {
    ...toChunkRow(row),
    user_id: row.document.userId,
  };
}

export type DocumentListItem = DocumentRow & { chunk_count: number };

export async function selectDocumentsByUserId(
  userId: number,
): Promise<DocumentListItem[]> {
  const rows = await getPrisma().document.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { chunks: true } },
    },
  });
  return rows.map((row) => ({
    ...toDocumentRow(row),
    chunk_count: row._count.chunks,
  }));
}

export async function selectDocumentDetail(
  documentId: string,
  userId: number,
): Promise<{
  document: DocumentRow;
  chunks: Array<Omit<DocumentChunkRow, "text">>;
} | null> {
  const doc = await getPrisma().document.findFirst({
    where: { id: documentId, userId },
    include: {
      chunks: {
        orderBy: { chunkIndex: "asc" },
        select: {
          id: true,
          documentId: true,
          chunkIndex: true,
          tokenCount: true,
          title: true,
          summary: true,
          status: true,
          errorMessage: true,
        },
      },
    },
  });
  if (!doc) {
    return null;
  }

  return {
    document: toDocumentRow(doc),
    chunks: doc.chunks.map((chunk) => ({
      id: chunk.id,
      document_id: chunk.documentId,
      chunk_index: chunk.chunkIndex,
      token_count: chunk.tokenCount,
      title: chunk.title,
      summary: chunk.summary,
      status: chunk.status,
      error_message: chunk.errorMessage,
    })),
  };
}

export async function updateChunkStatusAfterQuizGenerated(
  chunkId: string,
): Promise<void> {
  await getPrisma().documentChunk.updateMany({
    where: { id: chunkId, status: "summarized" },
    data: { status: "quiz_generated" },
  });
}

export type DeleteDocumentOutcome = "deleted" | "not_found" | "forbidden";

export async function deleteDocumentForUser(
  documentId: string,
  userId: number,
): Promise<DeleteDocumentOutcome> {
  const row = await getPrisma().document.findUnique({
    where: { id: documentId },
    select: { userId: true },
  });
  if (!row) {
    return "not_found";
  }
  if (row.userId !== userId) {
    return "forbidden";
  }
  await getPrisma().document.delete({ where: { id: documentId } });
  return "deleted";
}
