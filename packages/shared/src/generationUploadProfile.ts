import { PDF_OCR_MAX_PAGES } from "./pdfOcrLimits.js";
import {
  UPLOAD_MAX_BYTES_BASIC,
  UPLOAD_MAX_BYTES_PREMIUM,
  UPLOAD_MAX_TEXT_CHARS_BASIC,
  UPLOAD_MAX_TEXT_CHARS_PREMIUM,
} from "./uploadLimits.js";

export type TextOverflowPolicy = "truncate" | "error";

export type PdfPageOverflowPolicy = "error" | "first_pages" | "user_select";

export type GenerationUploadProfileKey = "landing" | "app";

export type GenerationUploadProfile = {
  key: GenerationUploadProfileKey;
  maxBytes: number;
  maxTextChars: number;
  textOverflow: TextOverflowPolicy;
  /** Maximum pages allowed in an uploaded PDF. */
  maxPdfPages: number;
  pdfPageOverflow: PdfPageOverflowPolicy;
  /** Premium: max pages the user can pick for one quiz/OCR run. */
  maxSelectablePages?: number;
  ocrConfirmRequired: boolean;
};

/** Basic plan: books larger than this are rejected outright. */
export const APP_BASIC_MAX_PDF_PAGES = 30;

export const PREMIUM_MAX_SELECTABLE_PAGES = 10;

export const LANDING_UPLOAD_PROFILE: GenerationUploadProfile = {
  key: "landing",
  maxBytes: UPLOAD_MAX_BYTES_BASIC,
  maxTextChars: UPLOAD_MAX_TEXT_CHARS_BASIC,
  textOverflow: "truncate",
  maxPdfPages: 3,
  pdfPageOverflow: "first_pages",
  ocrConfirmRequired: false,
};

export function buildAppUploadProfileForPlan(isPremium: boolean): GenerationUploadProfile {
  if (!isPremium) {
    return {
      key: "app",
      maxBytes: UPLOAD_MAX_BYTES_BASIC,
      maxTextChars: UPLOAD_MAX_TEXT_CHARS_BASIC,
      textOverflow: "error",
      maxPdfPages: APP_BASIC_MAX_PDF_PAGES,
      pdfPageOverflow: "error",
      ocrConfirmRequired: true,
    };
  }
  return {
    key: "app",
    maxBytes: UPLOAD_MAX_BYTES_PREMIUM,
    maxTextChars: UPLOAD_MAX_TEXT_CHARS_PREMIUM,
    textOverflow: "error",
    maxPdfPages: PDF_OCR_MAX_PAGES,
    pdfPageOverflow: "user_select",
    maxSelectablePages: PREMIUM_MAX_SELECTABLE_PAGES,
    ocrConfirmRequired: true,
  };
}

export function parseUploadProfileKey(
  value: unknown,
): GenerationUploadProfileKey | null {
  if (value === "landing" || value === "app") {
    return value;
  }
  return null;
}

export type ApplyTextLengthResult =
  | { ok: true; text: string; truncated: boolean }
  | { ok: false; error: "TEXT_TOO_LONG"; maxChars: number };

export function applyTextLengthPolicy(
  text: string,
  profile: GenerationUploadProfile,
): ApplyTextLengthResult {
  if (text.length <= profile.maxTextChars) {
    return { ok: true, text, truncated: false };
  }
  if (profile.textOverflow === "truncate") {
    return {
      ok: true,
      text: text.slice(0, profile.maxTextChars),
      truncated: true,
    };
  }
  return {
    ok: false,
    error: "TEXT_TOO_LONG",
    maxChars: profile.maxTextChars,
  };
}

export type ApplyPdfPagesResult =
  | {
      ok: true;
      pages: Array<{ pageIndex: number; text: string }>;
      totalPages: number;
      truncated: boolean;
    }
  | { ok: false; error: "pdf_too_many_pages"; totalPages: number; maxPages: number };

export function applyPdfPagePolicy(
  pages: Array<{ pageIndex: number; text: string }>,
  totalPages: number,
  profile: GenerationUploadProfile,
): ApplyPdfPagesResult {
  if (profile.pdfPageOverflow === "user_select") {
    if (totalPages > profile.maxPdfPages) {
      return {
        ok: false,
        error: "pdf_too_many_pages",
        totalPages,
        maxPages: profile.maxPdfPages,
      };
    }
    return { ok: true, pages, totalPages, truncated: false };
  }

  if (totalPages <= profile.maxPdfPages) {
    return { ok: true, pages, totalPages, truncated: false };
  }

  if (profile.pdfPageOverflow === "first_pages") {
    const limited = pages.filter((page) => page.pageIndex < profile.maxPdfPages);
    return {
      ok: true,
      pages: limited,
      totalPages: Math.min(totalPages, profile.maxPdfPages),
      truncated: true,
    };
  }

  return {
    ok: false,
    error: "pdf_too_many_pages",
    totalPages,
    maxPages: profile.maxPdfPages,
  };
}

export function buildPagePreview(text: string | null, maxChars = 280): string {
  const trimmed = text?.trim() ?? "";
  if (!trimmed) {
    return "";
  }
  if (trimmed.length <= maxChars) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxChars)}…`;
}
