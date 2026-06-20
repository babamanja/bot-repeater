import { useNavigate } from "react-router-dom";

import { normalizeQuizAnalyticsReason, trackAnalyticsEvent } from "../../analytics";
import { acceptQuiz, claimLandingQuiz } from "../../api/attempt";
import {
  clearLandingQuizProgress,
  readLandingQuizProgress,
} from "../../pages/landing/hooks/landingQuizProgress";
import useRequestState from "../useRequestState";

type SelectedAnswer = { questionId: string; answerIds: string[] };

function useSubmitQuizResult(
  quiz: { id: string } | null,
  selectedAnswers: SelectedAnswer[],
) {
  const { isLoading, setIsLoading, error, setError } = useRequestState();
  const navigate = useNavigate();
  const fromLanding = quiz ? readLandingQuizProgress(quiz.id) !== null : false;

  async function handleSubmit() {
    if (!quiz) {
      return;
    }
    setIsLoading(true);
    try {
      const payload = {
        quizId: quiz.id,
        answers: selectedAnswers.map((answer) => ({
          questionId: answer.questionId,
          answerIds: answer.answerIds,
        })),
      };
      const data = fromLanding ? await claimLandingQuiz(payload) : await acceptQuiz(payload);
      clearLandingQuizProgress();
      trackAnalyticsEvent("quiz_submit_succeeded", {
        quiz_id: quiz.id,
        attempt_id: data.attemptId,
      });
      navigate(`/attempts/${data.attemptId}`, {
        state: { quiz, checkResult: data },
      });
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "submit_failed";
      trackAnalyticsEvent("quiz_submit_failed", {
        quiz_id: quiz.id,
        reason: normalizeQuizAnalyticsReason(
          submitError instanceof Error ? submitError : "submit_failed",
          "quiz_submit",
        ),
      });
      if (message === "insufficient_tokens") {
        clearLandingQuizProgress();
        navigate("/my-subscription");
        return;
      }
      setError(message === "submit_failed" ? "Check failed" : message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleCancel() {
    clearLandingQuizProgress();
    navigate(`/quiz-list`);
  }

  return { handleSubmit, handleCancel, isLoading, error, fromLanding };
}

export default useSubmitQuizResult;
