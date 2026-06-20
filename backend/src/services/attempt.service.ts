import * as attemptRepository from "../db/attemptRepository.js";
import * as userRepository from "../db/userRepository.js";
import { isUuid } from "../utils/uuid.js";

type AttemptListQuery = {
  search?: string;
  sort?: "newest" | "oldest" | "score_desc" | "score_asc";
  score?: "all" | "pass" | "fail";
};

function calculateScoreRatio(correctCount: number, questionCount: number): number {
  if (questionCount <= 0) {
    return 0;
  }
  return correctCount / questionCount;
}

export async function listAttemptsByUser(userId: number, query: AttemptListQuery = {}) {
  if (!Number.isInteger(userId) || userId < 1) {
    return { ok: false as const, status: 401, error: "unauthorized" };
  }
  const user = await userRepository.selectUserById(userId);
  if (!user) {
    return { ok: false as const, status: 401, error: "unauthorized" };
  }
  const search = query.search?.trim().toLowerCase() ?? "";
  const sort = query.sort ?? "newest";
  const scoreFilter = query.score ?? "all";

  let attempts = await attemptRepository.selectAttemptsByUserId(userId);

  if (search.length > 0) {
    attempts = attempts.filter((attempt) =>
      attempt.quizTitle.toLowerCase().includes(search),
    );
  }

  if (scoreFilter !== "all") {
    attempts = attempts.filter((attempt) => {
      const isPassed = calculateScoreRatio(attempt.correctCount, attempt.questionCount) >= 0.6;
      return scoreFilter === "pass" ? isPassed : !isPassed;
    });
  }

  attempts.sort((a, b) => {
    if (sort === "oldest") {
      return (
        new Date(a.acceptedAt).getTime() - new Date(b.acceptedAt).getTime()
      );
    }
    if (sort === "score_desc") {
      return (
        calculateScoreRatio(b.correctCount, b.questionCount) -
        calculateScoreRatio(a.correctCount, a.questionCount)
      );
    }
    if (sort === "score_asc") {
      return (
        calculateScoreRatio(a.correctCount, a.questionCount) -
        calculateScoreRatio(b.correctCount, b.questionCount)
      );
    }
    return new Date(b.acceptedAt).getTime() - new Date(a.acceptedAt).getTime();
  });

  return { ok: true as const, attempts };
}

export async function getAttemptById(attemptId: string, currentUserId: number) {
  if (!isUuid(attemptId)) {
    return { ok: false as const, status: 400, error: "invalid attemptId" };
  }
  const attempt = await attemptRepository.selectAttemptById(attemptId);
  if (!attempt) {
    return { ok: false as const, status: 404, error: "attempt not found" };
  }
  if (attempt.userId !== currentUserId) {
    return { ok: false as const, status: 403, error: "forbidden" };
  }
  return { ok: true as const, attempt };
}
