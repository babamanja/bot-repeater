import type { SubscriptionPlanCode } from "../db/subscriptionRepository.js";

export {
  APP_BASIC_MAX_PDF_PAGES,
  LANDING_UPLOAD_PROFILE,
  PREMIUM_MAX_SELECTABLE_PAGES,
  applyPdfPagePolicy,
  buildPagePreview,
  parseUploadProfileKey,
  type ApplyPdfPagesResult,
  type GenerationUploadProfile,
  type GenerationUploadProfileKey,
  type PdfPageOverflowPolicy,
  type TextOverflowPolicy,
} from "@vocab-bot/shared/generationUploadProfile";

import {
  applyTextLengthPolicy as applyTextLengthPolicyShared,
  buildAppUploadProfileForPlan,
  type GenerationUploadProfile,
} from "@vocab-bot/shared/generationUploadProfile";

export type ApplyTextLengthResult =
  | { ok: true; text: string; truncated: boolean }
  | { ok: false; error: string; maxChars: number };

export function buildAppUploadProfile(
  planCode: SubscriptionPlanCode,
): GenerationUploadProfile {
  return buildAppUploadProfileForPlan(planCode === "premium");
}

export function applyTextLengthPolicy(
  text: string,
  profile: GenerationUploadProfile,
): ApplyTextLengthResult {
  const result = applyTextLengthPolicyShared(text, profile);
  if (result.ok === false) {
    return {
      ok: false,
      error: `TEXT_TOO_LONG:${result.maxChars}`,
      maxChars: result.maxChars,
    };
  }
  return result;
}
