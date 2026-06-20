import { PDF_OCR_MAX_PAGES } from "@vocab-bot/shared/pdfOcrLimits";
import {
  APP_BASIC_MAX_PDF_PAGES,
  LANDING_UPLOAD_PROFILE as SHARED_LANDING_UPLOAD_PROFILE,
  PREMIUM_MAX_SELECTABLE_PAGES,
  applyTextLengthPolicy,
  buildAppUploadProfileForPlan,
  type GenerationUploadProfile as SharedGenerationUploadProfile,
  type TextOverflowPolicy,
  type PdfPageOverflowPolicy,
  type GenerationUploadProfileKey,
} from "@vocab-bot/shared/generationUploadProfile";

export type { TextOverflowPolicy, PdfPageOverflowPolicy, GenerationUploadProfileKey };

export {
  APP_BASIC_MAX_PDF_PAGES,
  PREMIUM_MAX_SELECTABLE_PAGES,
  applyTextLengthPolicy,
};

export type GenerationUploadProfile = SharedGenerationUploadProfile & {
  maxMegabytes: number;
};

export const PDF_OCR_MAX_PAGES_APP = PDF_OCR_MAX_PAGES;

function withMegabytes(profile: SharedGenerationUploadProfile): GenerationUploadProfile {
  return {
    ...profile,
    maxMegabytes: profile.maxBytes / (1024 * 1024),
  };
}

export const LANDING_UPLOAD_PROFILE: GenerationUploadProfile = withMegabytes(
  SHARED_LANDING_UPLOAD_PROFILE,
);

export function buildAppUploadProfile(isPremium: boolean): GenerationUploadProfile {
  return withMegabytes(buildAppUploadProfileForPlan(isPremium));
}

export function getUploadProfileQueryParam(
  profile: GenerationUploadProfile,
): string | undefined {
  return profile.key === "landing" ? "landing" : undefined;
}

export type PdfPagePreview = {
  pageIndex: number;
  pageNumber: number;
  preview: string;
  needsOcr: boolean;
  hasText: boolean;
};
