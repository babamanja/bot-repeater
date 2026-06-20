import { apiClient } from "./_api";
import type { QuizGenerationSettingsPreview } from "./quiz";

export type DocumentSourceType = "pdf" | "docx" | "text";

export type DocumentStatus =
  | "uploaded"
  | "text_extracted"
  | "chunked"
  | "summarized"
  | "failed";

export type DocumentChunkStatus =
  | "pending"
  | "summarized"
  | "quiz_generated"
  | "failed";

export type DocumentSummary = {
  id: string;
  title: string;
  status: DocumentStatus;
  sourceType: DocumentSourceType;
  tokenCount: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  chunkCount?: number;
};

export type DocumentChunkSummary = {
  id: string;
  chunkIndex: number;
  title: string | null;
  tokenCount: number;
  status: DocumentChunkStatus;
  summary: string | null;
  errorMessage: string | null;
};

export type DocumentChunkDetail = DocumentChunkSummary;

export type DocumentDetailResponse = {
  document: DocumentSummary;
  chunks: DocumentChunkDetail[];
};

export type CreateDocumentResponse = {
  document: DocumentSummary;
  chunks: DocumentChunkSummary[];
  tokensChargedSummarization?: number;
};

export type DocumentGenerationPreview = {
  ok: true;
  documentId: string;
  chunkId: string | null;
  chunkCount: number;
  settings: QuizGenerationSettingsPreview["settings"];
  estimatedTokens: number;
  estimatedQuestions: number;
};

export async function createDocument(input: {
  title?: string;
  sourceType: DocumentSourceType;
  fullText: string;
  language?: string;
  saveOnly?: boolean;
}): Promise<CreateDocumentResponse> {
  const { data } = await apiClient.post<CreateDocumentResponse>("/documents", input);
  return data;
}

export async function getDocumentList(): Promise<DocumentSummary[]> {
  const { data } = await apiClient.get<DocumentSummary[]>("/documents");
  return data;
}

export async function getDocumentById(documentId: string): Promise<DocumentDetailResponse> {
  const { data } = await apiClient.get<DocumentDetailResponse>(
    `/documents/${encodeURIComponent(documentId)}`,
  );
  return data;
}

export async function getDocumentGenerationPreview(
  documentId: string,
  chunkId: string,
  options?: { questionCount?: number },
): Promise<DocumentGenerationPreview> {
  const { data } = await apiClient.get<DocumentGenerationPreview>(
    `/documents/${encodeURIComponent(documentId)}/generation-preview`,
    {
      params: {
        chunkId,
        ...(options?.questionCount !== undefined
          ? { questionCount: options.questionCount }
          : {}),
      },
    },
  );
  return data;
}

export async function deleteDocument(documentId: string): Promise<void> {
  await apiClient.delete(`/documents/${encodeURIComponent(documentId)}`);
}
