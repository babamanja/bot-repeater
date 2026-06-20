/**
 * Maps raw client/API error text to stable analytics `reason` codes for Meta/PostHog
 * (avoids long model messages and localized UI strings in dimensions).
 */
export type QuizAnalyticsFailureKind =
  | "quiz_generation"
  | "quiz_submit"
  | "quiz_edit_save";

/** Lowercased API or client branch message → stable snake_case reason. */
const STABLE_REASON_BY_MESSAGE: Record<string, string> = {
  unauthorized: "unauthorized",
  forbidden: "forbidden",
  "text is required": "text_required",
  "quiz not found": "quiz_not_found",
  "invalid quiz payload": "invalid_quiz_payload",
  "invalid answers payload": "invalid_answers_payload",
  "invalid quizid": "invalid_quiz_id",
  "invalid userid": "invalid_user_id",
  "user not found": "user_not_found",
  "no saved results for this quiz": "no_saved_results",
  "token deduction failed": "token_deduction_failed",
  update_rejected: "update_rejected",
};

function toTrimmedMessage(raw: unknown): string {
  if (typeof raw === "string") {
    return raw.trim();
  }
  if (raw instanceof Error) {
    return raw.message.trim();
  }
  return "";
}

export function normalizeQuizAnalyticsReason(
  raw: unknown,
  kind: QuizAnalyticsFailureKind,
): string {
  const message = toTrimmedMessage(raw);
  if (!message) {
    return "empty_error";
  }

  if (message.startsWith("INSUFFICIENT_TOKEN_BALANCE:")) {
    return "insufficient_token_balance";
  }

  if (message === "AUTH_REQUIRED_FOR_TOKEN_BILLING") {
    return "auth_required_for_token_billing";
  }

  const axiosStatusMatch = /^Request failed with status code (\d{3})$/i.exec(message);
  if (axiosStatusMatch) {
    return `http_${axiosStatusMatch[1]}`;
  }

  if (/^HTTP\s+\d{3}$/i.test(message)) {
    const code = message.replace(/\D/g, "");
    return `http_${code}`;
  }

  const lower = message.toLowerCase();
  if (lower === "network error") {
    return "network_error";
  }

  const mapped = STABLE_REASON_BY_MESSAGE[lower];
  if (mapped) {
    return mapped;
  }

  const isNoisy =
    message.length > 160 ||
    message.includes("\n") ||
    /\bECONNRESET\b|\bETIMEDOUT\b|\bENOTFOUND\b|\bECONNREFUSED\b/i.test(message) ||
    /\brate limit\b|\btimed out\b|\btimeout\b/i.test(message);

  if (isNoisy) {
    if (kind === "quiz_generation") {
      return "generation_upstream_error";
    }
    return "request_or_upstream_error";
  }

  if (/^[a-z][a-z0-9_]{0,79}$/i.test(message)) {
    return lower;
  }

  return "unknown_or_unclassified_error";
}
