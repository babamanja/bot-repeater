import type { AnalyticsChannelDimensions , AnalyticsEventName, AnalyticsEventProps } from "./types";

const CHANNEL_DIMENSION_KEYS: (keyof AnalyticsChannelDimensions)[] = [
  "quiz_id",
  "attempt_id",
  "question_id",
  "question_index",
  "total_questions",
  "payment_id",
  "checkout_type",
  "plan_code",
  "token_amount",
  "admin_user_id",
  "token_delta",
  "provider",
  "source",
  "estimated_tokens",
  "question_count",
  "reason",
  "result",
  "email_changed",
  "user_name_changed",
  "failure_reason",
  "quiz_count",
];

export function mapToMetaPixelEvent(event: AnalyticsEventName): string {
  switch (event) {
    case "auth_signup_succeeded":
      return "CompleteRegistration";
    case "auth_login_succeeded":
      return "Login";
    case "account_delete_succeeded":
      return "DeleteAccount";
    case "checkout_completed":
      return "Purchase";
    default:
      return "CustomEvent";
  }
}

export function buildChannelPayload<T extends AnalyticsEventName>(props: AnalyticsEventProps<T>) {
  const record = props as unknown as Record<string, unknown>;
  const dimensions: Record<string, unknown> = {};
  for (const key of CHANNEL_DIMENSION_KEYS) {
    if (key in record && record[key] !== undefined) {
      dimensions[key] = record[key];
    }
  }
  return {
    auth_method: "auth_method" in record ? record.auth_method : undefined,
    flow: "flow" in record ? record.flow : undefined,
    result: "result" in record ? record.result : undefined,
    reason: "reason" in record ? record.reason : undefined,
    cta_id: "cta_id" in record ? record.cta_id : undefined,
    cta_label: "cta_label" in record ? record.cta_label : undefined,
    page_path: "page_path" in record ? record.page_path : undefined,
    env: props.env,
    app_version: props.app_version,
    request_id: props.request_id,
    ...dimensions,
  };
}
