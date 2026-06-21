export type AuthMethod = "password" | "google";
export type AuthFlow = "signup" | "login" | "refresh";

export type AnalyticsBaseProps = {
  env: string;
  app_version: string;
  request_id?: string;
};

type AuthStartedProps = AnalyticsBaseProps & {
  auth_method: AuthMethod;
  flow: Exclude<AuthFlow, "refresh">;
  result: "started";
};

type AuthSucceededProps = AnalyticsBaseProps & {
  auth_method: AuthMethod;
  flow: Exclude<AuthFlow, "refresh">;
  result: "success";
};

type AuthRefreshSucceededProps = AnalyticsBaseProps & {
  auth_method: AuthMethod;
  flow: "refresh";
  result: "success";
};

type AuthFailedProps = AnalyticsBaseProps & {
  auth_method: AuthMethod;
  flow: AuthFlow;
  result: "failed";
  reason: string;
};

type AccountDeleteStartedProps = AnalyticsBaseProps & {
  flow: "delete";
  result: "started";
};

type AccountDeleteSucceededProps = AnalyticsBaseProps & {
  flow: "delete";
  result: "success";
};

type AccountDeleteFailedProps = AnalyticsBaseProps & {
  flow: "delete";
  result: "failed";
  reason: string;
};

type UiCtaClickedProps = AnalyticsBaseProps & {
  cta_id: string;
  cta_label?: string;
  page_path?: string;
};

/** Optional dimensions passed to Meta (see buildChannelPayload). */
export type AnalyticsChannelDimensions = {
  quiz_id?: string;
  attempt_id?: string;
  question_id?: string;
  question_index?: number;
  total_questions?: number;
  payment_id?: string;
  checkout_type?: string;
  plan_code?: string;
  token_amount?: number;
  admin_user_id?: number;
  token_delta?: number;
  provider?: string;
  source?: string;
  estimated_tokens?: number;
  question_count?: number;
  reason?: string;
  result?: string;
  email_changed?: boolean;
  user_name_changed?: boolean;
  failure_reason?: string;
  quiz_count?: number;
  category?: string;
  premium_until?: string;
};

type QualificationOpenedProps = AnalyticsBaseProps &
  AnalyticsChannelDimensions & {
    question_count: number;
  };

type QualificationAnsweredProps = AnalyticsBaseProps &
  AnalyticsChannelDimensions & {
    question_id: string;
    question_index: number;
  };

type QualificationSubmittedProps = AnalyticsBaseProps & AnalyticsChannelDimensions;

type QualificationSkippedProps = AnalyticsBaseProps & AnalyticsChannelDimensions;

type TokensInsufficientShownProps = AnalyticsBaseProps &
  AnalyticsChannelDimensions & {
    required_tokens?: number;
  };

type CheckoutStartedProps = AnalyticsBaseProps &
  AnalyticsChannelDimensions & {
    checkout_type: "subscription" | "token_topup";
    plan_code: string;
    token_amount?: number;
  };

type CheckoutRedirectedProps = AnalyticsBaseProps &
  AnalyticsChannelDimensions & {
    payment_id: string;
    checkout_type: "subscription" | "token_topup";
    plan_code: string;
  };

type CheckoutCompletedProps = AnalyticsBaseProps &
  AnalyticsChannelDimensions & {
    payment_id: string;
    plan_code?: string;
    checkout_type?: string;
  };

type CheckoutFailedProps = AnalyticsBaseProps &
  AnalyticsChannelDimensions & {
    payment_id?: string;
    reason: string;
    stage?: "create_session" | "checkout_page" | "payment";
  };

type SubscriptionOpenedProps = AnalyticsBaseProps & AnalyticsChannelDimensions;

type BillingHistoryOpenedProps = AnalyticsBaseProps & AnalyticsChannelDimensions;

type ProfileUpdatedProps = AnalyticsBaseProps &
  AnalyticsChannelDimensions & {
    email_changed: boolean;
    user_name_changed: boolean;
  };

type ProfileUpdateFailedProps = AnalyticsBaseProps &
  AnalyticsChannelDimensions & {
    failure_reason: string;
  };

type AdminPageOpenedProps = AnalyticsBaseProps & AnalyticsChannelDimensions;

type AdminUserDetailsOpenedProps = AnalyticsBaseProps &
  AnalyticsChannelDimensions & {
    admin_user_id: number;
  };

type AdminTokensAdjustedProps = AnalyticsBaseProps &
  AnalyticsChannelDimensions & {
    admin_user_id: number;
    token_delta: number;
  };

type AdminRefundStartedProps = AnalyticsBaseProps &
  AnalyticsChannelDimensions & {
    payment_id: string;
  };

type AdminRefundOutcomeProps = AnalyticsBaseProps &
  AnalyticsChannelDimensions & {
    payment_id: string;
    reason?: string;
  };

type AdminPromptSavedProps = AnalyticsBaseProps & AnalyticsChannelDimensions;

type AdminPromptResetProps = AnalyticsBaseProps & AnalyticsChannelDimensions;

type AdminQualificationTemplateSavedProps = AnalyticsBaseProps & AnalyticsChannelDimensions;

type AdminTokenSettingsSavedProps = AnalyticsBaseProps & AnalyticsChannelDimensions;

type AdminTokenSettingsResetProps = AnalyticsBaseProps & AnalyticsChannelDimensions;

type AdminFeedbackOpenedProps = AnalyticsBaseProps & AnalyticsChannelDimensions;

type AdminChunkSummaryPromptSavedProps = AnalyticsBaseProps & AnalyticsChannelDimensions;

type AdminChunkSummaryPromptResetProps = AnalyticsBaseProps & AnalyticsChannelDimensions;

type AdminPremiumGrantedProps = AnalyticsBaseProps &
  AnalyticsChannelDimensions & {
    admin_user_id: number;
    premium_until: string;
  };

type FeedbackSubmittedProps = AnalyticsBaseProps &
  AnalyticsChannelDimensions & {
    category: string;
  };

type FeedbackSubmitFailedProps = AnalyticsBaseProps &
  AnalyticsChannelDimensions & {
    category: string;
    reason: string;
  };

export type AnalyticsEventMap = {
  auth_signup_started: AuthStartedProps;
  auth_signup_succeeded: AuthSucceededProps;
  auth_login_started: AuthStartedProps;
  auth_login_succeeded: AuthSucceededProps;
  auth_refresh_succeeded: AuthRefreshSucceededProps;
  auth_failed: AuthFailedProps;
  account_delete_started: AccountDeleteStartedProps;
  account_delete_succeeded: AccountDeleteSucceededProps;
  account_delete_failed: AccountDeleteFailedProps;
  ui_cta_clicked: UiCtaClickedProps;
  qualification_opened: QualificationOpenedProps;
  qualification_answered: QualificationAnsweredProps;
  qualification_submitted: QualificationSubmittedProps;
  qualification_skipped: QualificationSkippedProps;
  tokens_insufficient_shown: TokensInsufficientShownProps;
  checkout_started: CheckoutStartedProps;
  checkout_redirected: CheckoutRedirectedProps;
  checkout_completed: CheckoutCompletedProps;
  checkout_failed: CheckoutFailedProps;
  subscription_opened: SubscriptionOpenedProps;
  billing_history_opened: BillingHistoryOpenedProps;
  profile_updated: ProfileUpdatedProps;
  profile_update_failed: ProfileUpdateFailedProps;
  admin_users_opened: AdminPageOpenedProps;
  admin_user_details_opened: AdminUserDetailsOpenedProps;
  admin_tokens_adjusted: AdminTokensAdjustedProps;
  admin_payments_opened: AdminPageOpenedProps;
  admin_refund_started: AdminRefundStartedProps;
  admin_refund_succeeded: AdminRefundOutcomeProps;
  admin_refund_failed: AdminRefundOutcomeProps;
  admin_prompt_opened: AdminPageOpenedProps;
  admin_prompt_saved: AdminPromptSavedProps;
  admin_prompt_reset: AdminPromptResetProps;
  admin_qualification_template_saved: AdminQualificationTemplateSavedProps;
  admin_token_settings_opened: AdminPageOpenedProps;
  admin_token_settings_saved: AdminTokenSettingsSavedProps;
  admin_token_settings_reset: AdminTokenSettingsResetProps;
  admin_token_analytics_opened: AdminPageOpenedProps;
  admin_ai_usage_opened: AdminPageOpenedProps;
  admin_feedback_opened: AdminFeedbackOpenedProps;
  admin_user_pairs_opened: AdminPageOpenedProps;
  admin_chunk_summary_prompt_saved: AdminChunkSummaryPromptSavedProps;
  admin_chunk_summary_prompt_reset: AdminChunkSummaryPromptResetProps;
  admin_premium_granted: AdminPremiumGrantedProps;
  feedback_submitted: FeedbackSubmittedProps;
  feedback_submit_failed: FeedbackSubmitFailedProps;
};

export type AnalyticsEventName = keyof AnalyticsEventMap;
export type AnalyticsEventProps<T extends AnalyticsEventName> = AnalyticsEventMap[T];

export type Provider = {
  track: <T extends AnalyticsEventName>(event: T, props: AnalyticsEventProps<T>) => void;
  identify: (userId: string) => void;
  reset: () => void;
};
