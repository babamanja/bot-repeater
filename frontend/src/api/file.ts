import { apiClient } from "./_api";

export type FileExtractionMethod = "pdf_text" | "ocr";

export type FileExtractResponse = {
  text: string;
  pages: number;
  chars: number;
  extractionMethod: FileExtractionMethod;
  tokensCharged?: number;
  textTruncated?: boolean;
};

export type PdfOcrJobStatus =
  | "awaiting_confirmation"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type PdfOcrJob = {
  id: string;
  status: PdfOcrJobStatus;
  originalFilename: string;
  totalPages: number;
  pagesNeedingOcr: number;
  pagesCompleted: number;
  tokenCostPerPage: number;
  totalTokenCost: number;
  tokensCharged: number;
  assembledText: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PdfAnalyzeCompletedResponse = {
  status: "completed";
  totalPages: number;
  pagesNeedingOcr: 0;
  tokenCostPerPage: number;
  totalTokenCost: 0;
  assembledText: string;
  pdfPagesTruncated?: boolean;
  originalTotalPages?: number;
  textTruncated?: boolean;
};

export type PdfAnalyzeOcrRequiredResponse = {
  status: "awaiting_confirmation";
  job: PdfOcrJob;
  assembledText: string;
  pdfPagesTruncated?: boolean;
  originalTotalPages?: number;
  textTruncated?: boolean;
};

export type PdfPagePreview = {
  pageIndex: number;
  pageNumber: number;
  preview: string;
  needsOcr: boolean;
  hasText: boolean;
};

export type PdfAnalyzePageSelectionResponse = {
  status: "page_selection_required";
  job: PdfOcrJob;
  pages: PdfPagePreview[];
  maxSelectablePages: number;
  pdfPagesTruncated?: boolean;
  originalTotalPages?: number;
};

export type PdfAnalyzeResponse =
  | PdfAnalyzeCompletedResponse
  | PdfAnalyzeOcrRequiredResponse
  | PdfAnalyzePageSelectionResponse;

export type PdfSelectPagesResponse =
  | (PdfAnalyzeCompletedResponse & { job: PdfOcrJob })
  | (PdfAnalyzeOcrRequiredResponse & { job: PdfOcrJob });

export async function extractUploadText(
  file: File,
  uploadProfile?: string,
): Promise<FileExtractResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<FileExtractResponse>("/files/pdf/extract", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    params: uploadProfile ? { uploadProfile } : undefined,
  });
  return data;
}

export async function analyzePdfUpload(
  file: File,
  uploadProfile?: string,
): Promise<PdfAnalyzeResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<PdfAnalyzeResponse>("/files/pdf/analyze", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    params: uploadProfile ? { uploadProfile } : undefined,
  });
  return data;
}

export async function getPdfOcrJob(jobId: string): Promise<PdfOcrJob> {
  const { data } = await apiClient.get<PdfOcrJob>(`/files/pdf/ocr-jobs/${jobId}`);
  return data;
}

export async function startPdfOcrJob(jobId: string): Promise<PdfOcrJob> {
  const { data } = await apiClient.post<PdfOcrJob>(`/files/pdf/ocr-jobs/${jobId}/start`);
  return data;
}

export async function cancelPdfOcrJob(jobId: string): Promise<PdfOcrJob> {
  const { data } = await apiClient.post<PdfOcrJob>(`/files/pdf/ocr-jobs/${jobId}/cancel`);
  return data;
}

export async function selectPdfOcrPages(
  jobId: string,
  pageIndices: number[],
): Promise<PdfSelectPagesResponse> {
  const { data } = await apiClient.post<PdfSelectPagesResponse>(
    `/files/pdf/ocr-jobs/${jobId}/select-pages`,
    { pageIndices },
  );
  return data;
}

export const FILE_EXTRACT_ERROR_CODES = [
  "file_required",
  "unsupported_file_type",
  "file_too_large",
  "pdf_too_many_pages",
  "invalid_page_selection",
  "ocr_unavailable",
  "ocr_empty_text",
  "pdf_parse_failed",
  "job_not_found",
  "job_not_startable",
  "job_not_cancellable",
] as const;

export type FileExtractErrorCode = (typeof FILE_EXTRACT_ERROR_CODES)[number];

export function isFileExtractErrorCode(value: string): value is FileExtractErrorCode {
  return (FILE_EXTRACT_ERROR_CODES as readonly string[]).includes(value);
}
