import type { TFunction } from "i18next";

import { isFileExtractErrorCode } from "../api/file";

export function mapFileExtractError(message: string, t: TFunction): string {
  if (isFileExtractErrorCode(message)) {
    switch (message) {
      case "file_required":
        return t("upload.extractFileRequired");
      case "unsupported_file_type":
        return t("upload.dropzoneInvalidType");
      case "file_too_large":
        return t("upload.extractFileTooLarge");
      case "pdf_too_many_pages":
        return t("upload.pdfTooManyPages");
      case "invalid_page_selection":
        return t("upload.pdfPageSelectInvalid");
      case "ocr_unavailable":
        return t("upload.ocrUnavailable");
      case "ocr_empty_text":
        return t("upload.ocrEmptyText");
      case "pdf_parse_failed":
        return t("upload.pdfParseFailed");
      default:
        break;
    }
  }
  return message;
}

export function isPdfUploadFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  return file.type === "application/pdf" || lower.endsWith(".pdf");
}

export function isImageUploadFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  if (
    file.type === "image/jpeg" ||
    file.type === "image/png" ||
    file.type === "image/webp" ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".webp")
  ) {
    return true;
  }
  return false;
}

export function isExtractableUploadFile(file: File): boolean {
  return isPdfUploadFile(file) || isImageUploadFile(file);
}
