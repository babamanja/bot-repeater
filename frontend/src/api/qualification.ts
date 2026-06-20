import { apiClient } from "./_api";

export type QualificationQuestion = {
  id: string;
  prompt: string;
  options: string[];
};

export type QualificationState = {
  ok: true;
  completed: boolean;
  shouldPrompt: boolean;
  deferredUntil: string | null;
  completedAt: string | null;
  questions: QualificationQuestion[];
};

export async function getMyQualificationState(): Promise<QualificationState> {
  const { data } = await apiClient.get<QualificationState>("/qualification/me");
  return data;
}

export async function submitMyQualification(
  answers: Array<{
    questionId: string;
    prompt: string;
    selectedOption: string | null;
    freeText: string;
  }>,
): Promise<{ ok: true }> {
  const { data } = await apiClient.post<{ ok: true }>("/qualification/me/submit", { answers });
  return data;
}

export async function skipMyQualification(): Promise<{ ok: true }> {
  const { data } = await apiClient.post<{ ok: true }>("/qualification/me/skip");
  return data;
}
