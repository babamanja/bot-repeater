import { apiClient } from "./_api";

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PaginatedResponse<T> = {
  items: T[];
  pagination: PaginationMeta;
};

export type AdminUser = {
  id: number;
  userName: string;
  email: string | null;
  role: "user" | "admin";
  providers: {
    password: boolean;
    google: boolean;
    telegram: boolean;
  };
  vocabPairCount: number;
};

export type AdminUserDetails = {
  id: number;
  userName: string;
  email: string | null;
  role: "user" | "admin";
  providers: {
    password: boolean;
    google: boolean;
    telegram: boolean;
  };
  tokenBalance: number;
  vocabPairCount: number;
  subscription: {
    id: string;
    planCode: "basic" | "premium";
    status: "active" | "canceled" | "past_due";
    currentPeriodEnd: string | null;
    createdAt: string;
    paymentId: string | null;
  } | null;
  recentPayments: Array<{
    id: string;
    date: string;
    amount: number;
    currency: string;
    status: "pending" | "succeeded" | "failed" | "refunded";
    transactionType: "payment" | "refund";
    provider: string | null;
  }>;
  recentTokenLedger: Array<{
    id: string;
    delta: number;
    balanceAfter: number | null;
    transactionType: "purchase" | "spend" | "refund" | "bonus" | "expire" | "admin_adjustment";
    referenceId: string | null;
    createdAt: string;
  }>;
};

export type AdminPayment = {
  id: string;
  date: string;
  userId: number;
  userName: string;
  email: string;
  amount: number;
  currency: string;
  status: "pending" | "succeeded" | "failed" | "refunded";
  provider: string | null;
  providerTransactionId: string | null;
  description: string | null;
  metadata: unknown;
  originalPaymentId: string | null;
  refundReason: string | null;
  transactionType: "payment" | "refund";
  createdAt: string;
  updatedAt: string;
};

export type AdminAiUsage = {
  periodDays: number;
  items: Array<{
    id: string;
    feature: string;
    createdAt: string;
    userId: number | null;
    status: "success" | "failed";
    sourceTextLength: number;
    estimatedTokens: number;
    aiInputTokens: number | null;
    aiOutputTokens: number | null;
    aiTotalTokens: number | null;
    aiModel: string | null;
    errorMessage: string | null;
  }>;
  pagination: PaginationMeta;
};

export type AdminAiUsageQuery = {
  days?: number;
  page?: number;
  pageSize?: number;
  sortBy?: "createdAt" | "aiTotalTokens" | "estimatedTokens" | "sourceTextLength";
  sortOrder?: "asc" | "desc";
  status?: "success" | "failed";
  userId?: number;
  search?: string;
};

export type AdminQualificationTemplate = {
  questions: Array<{ id: string; prompt: string; options: string[] }>;
  defaultQuestions: Array<{ id: string; prompt: string; options: string[] }>;
};

export type AdminQualificationSubmission = {
  id: string;
  userId: number;
  userName: string;
  email: string;
  status: "completed" | "skipped";
  submittedAt: string;
  completedAt: string | null;
  deferredUntil: string | null;
  answers: Array<{
    questionId: string;
    prompt: string;
    selectedOption: string | null;
    freeText: string;
  }>;
};

export type AdminQualificationSubmissionsQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: "completed" | "skipped";
};

export type AdminUsersQuery = {
  page?: number;
  pageSize?: number;
  sortBy?: "id" | "userName" | "email" | "role" | "tokenBalance";
  sortOrder?: "asc" | "desc";
  role?: "user" | "admin";
  search?: string;
};

export type AdminPaymentsQuery = {
  page?: number;
  pageSize?: number;
  sortBy?: "date" | "amount" | "status" | "transactionType";
  sortOrder?: "asc" | "desc";
  status?: "pending" | "succeeded" | "failed" | "refunded";
  transactionType?: "payment" | "refund";
  search?: string;
};

export type AdminUserPair = {
  id: string;
  userId: number;
  userName: string | null;
  email: string | null;
  vocabPairId: number;
  pimsleurLevel: number;
  nextReviewMs: string;
};

export type AdminUserPairsQuery = {
  page?: number;
  pageSize?: number;
  sortBy?: "nextReviewMs" | "pimsleurLevel";
  sortOrder?: "asc" | "desc";
  search?: string;
};

export type AdminFeedbackItem = {
  id: string;
  userId: number;
  userName: string;
  email: string;
  category: "bug" | "feature" | "question" | "other";
  message: string;
  createdAt: string;
};

export type AdminFeedbackQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: "bug" | "feature" | "question" | "other";
};

export async function getAdminUsers(
  query: AdminUsersQuery = {},
): Promise<PaginatedResponse<AdminUser>> {
  const { data } = await apiClient.get<PaginatedResponse<AdminUser>>("/admin/users", {
    params: query,
  });
  return data;
}

export async function getAdminUserDetails(userId: number): Promise<AdminUserDetails> {
  const { data } = await apiClient.get<AdminUserDetails>(`/admin/users/${userId}`);
  return data;
}

export async function adjustAdminUserTokens(
  userId: number,
  payload: { delta: number; comment: string },
): Promise<{ balance: number }> {
  const { data } = await apiClient.post<{ balance: number }>(
    `/admin/users/${userId}/tokens/adjust`,
    payload,
  );
  return data;
}

export type AdminGrantPremiumSubscriptionResult = {
  subscription: NonNullable<AdminUserDetails["subscription"]>;
};

export async function grantAdminPremiumSubscription(
  userId: number,
  payload: { currentPeriodEnd: string },
): Promise<AdminGrantPremiumSubscriptionResult> {
  const { data } = await apiClient.post<AdminGrantPremiumSubscriptionResult>(
    `/admin/users/${userId}/subscription/grant-premium`,
    payload,
  );
  return data;
}

export async function getAdminPayments(
  query: AdminPaymentsQuery = {},
): Promise<PaginatedResponse<AdminPayment>> {
  const { data } = await apiClient.get<PaginatedResponse<AdminPayment>>("/admin/payments", {
    params: query,
  });
  return data;
}

export async function refundAdminPayment(
  paymentId: string,
  payload: { reason: string },
): Promise<{ originalPaymentId: string; refundPaymentId: string }> {
  const { data } = await apiClient.post<{ originalPaymentId: string; refundPaymentId: string }>(
    `/admin/payments/${paymentId}/refund`,
    payload,
  );
  return data;
}

export async function getAdminAiUsage(
  query: AdminAiUsageQuery = {},
): Promise<AdminAiUsage> {
  const { data } = await apiClient.get<AdminAiUsage>("/admin/ai-usage", {
    params: query,
  });
  return data;
}

export async function getAdminQualificationTemplate(): Promise<AdminQualificationTemplate> {
  const { data } = await apiClient.get<AdminQualificationTemplate>("/admin/qualification-template");
  return data;
}

export async function updateAdminQualificationTemplate(
  questions: Array<{ id: string; prompt: string; options: string[] }>,
): Promise<{ questions: Array<{ id: string; prompt: string; options: string[] }> }> {
  const { data } = await apiClient.put<{
    questions: Array<{ id: string; prompt: string; options: string[] }>;
  }>("/admin/qualification-template", { questions });
  return data;
}

export async function getAdminQualificationSubmissions(
  query: AdminQualificationSubmissionsQuery = {},
): Promise<PaginatedResponse<AdminQualificationSubmission>> {
  const { data } = await apiClient.get<PaginatedResponse<AdminQualificationSubmission>>(
    "/admin/qualification-submissions",
    { params: query },
  );
  return data;
}

export async function getAdminFeedback(
  query: AdminFeedbackQuery = {},
): Promise<PaginatedResponse<AdminFeedbackItem>> {
  const { data } = await apiClient.get<PaginatedResponse<AdminFeedbackItem>>(
    "/admin/feedback",
    { params: query },
  );
  return data;
}

export async function getAdminUserPairs(
  query: AdminUserPairsQuery = {},
): Promise<PaginatedResponse<AdminUserPair>> {
  const { data } = await apiClient.get<PaginatedResponse<AdminUserPair>>("/admin/user-pairs", {
    params: query,
  });
  return data;
}
