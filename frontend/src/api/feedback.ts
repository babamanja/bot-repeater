import { apiClient } from "./_api";

export type FeedbackCategory = "bug" | "feature" | "question" | "other";

export type FeedbackSubmission = {
  id: string;
  category: FeedbackCategory;
  createdAt: string;
};

export async function submitFeedback(input: {
  category: FeedbackCategory;
  message: string;
}): Promise<FeedbackSubmission> {
  const { data } = await apiClient.post<FeedbackSubmission>("/feedback", input);
  return data;
}
