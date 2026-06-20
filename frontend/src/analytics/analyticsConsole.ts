export type AnalyticsSentTo = "PostHog" | "Meta Pixel" | "Google Ads";

export function logAnalyticsOutgoing(payload: {
  message: string;
  sentTo: AnalyticsSentTo;
  metadata: Record<string, unknown>;
}): void {
  console.log(payload);
}

/** Human-readable label for console; channel-specific names stay in sentTo. */
export function trackLogMessage(event: string): string {
  switch (event) {
    case "ui_cta_clicked":
      return "CTA clicked";
    case "$pageview":
      return "Page view";
    default:
      if (event.startsWith("auth_")) {
        return `Auth (${event})`;
      }
      if (event.startsWith("account_delete")) {
        return `Account delete (${event})`;
      }
      if (event.startsWith("qualification_")) {
        return `Qualification (${event})`;
      }
      if (event.startsWith("quiz_generation") || event.startsWith("tokens_insufficient")) {
        return `Quiz generation (${event})`;
      }
      if (event.startsWith("quiz_edit_")) {
        return `Quiz edit (${event})`;
      }
      if (event.startsWith("quiz_list")) {
        return `Quiz list (${event})`;
      }
      if (event.startsWith("quiz_submit") || event === "quiz_started" || event === "quiz_answer_selected") {
        return `Quiz session (${event})`;
      }
      if (event.startsWith("attempt")) {
        return `Attempts (${event})`;
      }
      if (event.startsWith("checkout_") || event === "subscription_opened" || event === "billing_history_opened") {
        return `Billing (${event})`;
      }
      if (event.startsWith("admin_")) {
        return `Admin (${event})`;
      }
      return `Analytics (${event})`;
  }
}
