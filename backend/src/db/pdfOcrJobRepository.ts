import type { PdfOcrJobPageStatus, PdfOcrJobStatus } from "@prisma/client";

import { getPrisma } from "./prisma.js";

export type PdfOcrJobRow = {
  id: string;
  user_id: number;
  original_filename: string;
  status: PdfOcrJobStatus;
  total_pages: number;
  pages_needing_ocr: number;
  pages_completed: number;
  token_cost_per_page: number;
  tokens_charged: number;
  assembled_text: string | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
};

export type PdfOcrJobPageRow = {
  id: string;
  job_id: string;
  page_index: number;
  status: PdfOcrJobPageStatus;
  text: string | null;
};

function mapJob(row: {
  id: string;
  userId: number;
  originalFilename: string;
  status: PdfOcrJobStatus;
  totalPages: number;
  pagesNeedingOcr: number;
  pagesCompleted: number;
  tokenCostPerPage: number;
  tokensCharged: number;
  assembledText: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}): PdfOcrJobRow {
  return {
    id: row.id,
    user_id: row.userId,
    original_filename: row.originalFilename,
    status: row.status,
    total_pages: row.totalPages,
    pages_needing_ocr: row.pagesNeedingOcr,
    pages_completed: row.pagesCompleted,
    token_cost_per_page: row.tokenCostPerPage,
    tokens_charged: row.tokensCharged,
    assembled_text: row.assembledText,
    error_message: row.errorMessage,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function mapPage(row: {
  id: string;
  jobId: string;
  pageIndex: number;
  status: PdfOcrJobPageStatus;
  text: string | null;
}): PdfOcrJobPageRow {
  return {
    id: row.id,
    job_id: row.jobId,
    page_index: row.pageIndex,
    status: row.status,
    text: row.text,
  };
}

export function toPublicPdfOcrJob(row: PdfOcrJobRow) {
  return {
    id: row.id,
    status: row.status,
    originalFilename: row.original_filename,
    totalPages: row.total_pages,
    pagesNeedingOcr: row.pages_needing_ocr,
    pagesCompleted: row.pages_completed,
    tokenCostPerPage: row.token_cost_per_page,
    totalTokenCost: row.pages_needing_ocr * row.token_cost_per_page,
    tokensCharged: row.tokens_charged,
    assembledText: row.assembled_text,
    errorMessage: row.error_message,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function insertPdfOcrJob(input: {
  id: string;
  userId: number;
  originalFilename: string;
  status: PdfOcrJobStatus;
  totalPages: number;
  pagesNeedingOcr: number;
  tokenCostPerPage: number;
  assembledText: string | null;
  pdfData: Buffer;
  pages: Array<{
    id: string;
    pageIndex: number;
    status: PdfOcrJobPageStatus;
    text: string | null;
  }>;
}): Promise<PdfOcrJobRow> {
  const row = await getPrisma().pdfOcrJob.create({
    data: {
      id: input.id,
      userId: input.userId,
      originalFilename: input.originalFilename,
      status: input.status,
      totalPages: input.totalPages,
      pagesNeedingOcr: input.pagesNeedingOcr,
      tokenCostPerPage: input.tokenCostPerPage,
      assembledText: input.assembledText,
      pdfData: Uint8Array.from(input.pdfData),
      pages: {
        create: input.pages.map((page) => ({
          id: page.id,
          pageIndex: page.pageIndex,
          status: page.status,
          text: page.text,
        })),
      },
    },
  });
  return mapJob(row);
}

export async function selectPdfOcrJobById(
  jobId: string,
): Promise<(PdfOcrJobRow & { pdf_data: Buffer }) | null> {
  const row = await getPrisma().pdfOcrJob.findUnique({
    where: { id: jobId },
  });
  if (!row) {
    return null;
  }
  return {
    ...mapJob(row),
    pdf_data: Buffer.from(row.pdfData),
  };
}

export async function selectPdfOcrJobForUser(
  jobId: string,
  userId: number,
): Promise<PdfOcrJobRow | null> {
  const row = await getPrisma().pdfOcrJob.findFirst({
    where: { id: jobId, userId },
  });
  return row ? mapJob(row) : null;
}

export async function selectPdfOcrJobPages(jobId: string): Promise<PdfOcrJobPageRow[]> {
  const rows = await getPrisma().pdfOcrJobPage.findMany({
    where: { jobId },
    orderBy: { pageIndex: "asc" },
  });
  return rows.map(mapPage);
}

export async function selectNextPdfOcrJobPageNeedingOcr(
  jobId: string,
): Promise<PdfOcrJobPageRow | null> {
  const row = await getPrisma().pdfOcrJobPage.findFirst({
    where: { jobId, status: "needs_ocr" },
    orderBy: { pageIndex: "asc" },
  });
  return row ? mapPage(row) : null;
}

export async function updatePdfOcrJobStatus(
  jobId: string,
  status: PdfOcrJobStatus,
  data?: {
    pagesCompleted?: number;
    assembledText?: string | null;
    tokensCharged?: number;
    errorMessage?: string | null;
    clearPdfData?: boolean;
  },
): Promise<void> {
  await getPrisma().pdfOcrJob.update({
    where: { id: jobId },
    data: {
      status,
      pagesCompleted: data?.pagesCompleted,
      assembledText: data?.assembledText,
      tokensCharged: data?.tokensCharged,
      errorMessage: data?.errorMessage,
      ...(data?.clearPdfData ? { pdfData: Buffer.alloc(0) } : {}),
    },
  });
}

export async function updatePdfOcrJobPageResult(
  pageId: string,
  input: {
    status: PdfOcrJobPageStatus;
    text: string | null;
  },
): Promise<void> {
  await getPrisma().pdfOcrJobPage.update({
    where: { id: pageId },
    data: {
      status: input.status,
      text: input.text,
    },
  });
}

export async function incrementPdfOcrJobPagesCompleted(jobId: string): Promise<number> {
  const row = await getPrisma().pdfOcrJob.update({
    where: { id: jobId },
    data: {
      pagesCompleted: { increment: 1 },
    },
    select: { pagesCompleted: true },
  });
  return row.pagesCompleted;
}

export async function isPdfOcrJobCancelled(jobId: string): Promise<boolean> {
  const row = await getPrisma().pdfOcrJob.findUnique({
    where: { id: jobId },
    select: { status: true },
  });
  return row?.status === "cancelled";
}

export async function rebuildPdfOcrJobAssembledText(jobId: string): Promise<string> {
  const pages = await selectPdfOcrJobPages(jobId);
  return assemblePageTexts(pages);
}

export async function deletePdfOcrJobPagesExcept(
  jobId: string,
  pageIndices: number[],
): Promise<void> {
  await getPrisma().pdfOcrJobPage.deleteMany({
    where: {
      jobId,
      pageIndex: { notIn: pageIndices },
    },
  });
}

export async function updatePdfOcrJobAfterPageSelection(
  jobId: string,
  data: {
    totalPages: number;
    pagesNeedingOcr: number;
    assembledText: string | null;
  },
): Promise<void> {
  await getPrisma().pdfOcrJob.update({
    where: { id: jobId },
    data: {
      totalPages: data.totalPages,
      pagesNeedingOcr: data.pagesNeedingOcr,
      pagesCompleted: 0,
      assembledText: data.assembledText,
    },
  });
}

export function assemblePageTexts(
  pages: Array<{ page_index: number; text: string | null }>,
): string {
  return pages
    .slice()
    .sort((a, b) => a.page_index - b.page_index)
    .map((page) => page.text?.trim() ?? "")
    .join("\n\n")
    .trim();
}
