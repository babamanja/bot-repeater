import { apiClient } from "./_api";
import type { AcceptQuizRequest, AcceptQuizResponse, Attempt, AttemptListItem } from "./_types";

export async function acceptQuiz(req: AcceptQuizRequest): Promise<AcceptQuizResponse> {
  const { data } = await apiClient.post<AcceptQuizResponse>(
    `/quiz/${encodeURIComponent(req.quizId)}/accept`,
    {
      answers: req.answers,
    },
  );
  return data;
}

export async function claimLandingQuiz(req: AcceptQuizRequest): Promise<AcceptQuizResponse> {
  const { data } = await apiClient.post<AcceptQuizResponse>(
    `/quiz/${encodeURIComponent(req.quizId)}/landing/claim`,
    {
      answers: req.answers,
    },
  );
  return data;
}

export async function getQuizResults(quizId: string): Promise<Attempt> {
  const { data } = await apiClient.get<Attempt>(`/attempts/${encodeURIComponent(quizId)}/results`);
  return data;
}

export type AttemptListQuery = {
  search?: string;
  sort?: "newest" | "oldest" | "score_desc" | "score_asc";
};

export async function getAttemptList(query: AttemptListQuery = {}): Promise<AttemptListItem[]> {
  const { data } = await apiClient.get<AttemptListItem[]>("/attempts/list", {
    params: query,
  });
  return data;
}
