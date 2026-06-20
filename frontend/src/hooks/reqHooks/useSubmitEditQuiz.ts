import { useNavigate, useParams } from "react-router-dom";

import { normalizeQuizAnalyticsReason, trackAnalyticsEvent } from "../../analytics";
import { updateQuiz } from "../../api/quiz";
import type { QuizExtended } from "../../types";
import useRequestState from "../useRequestState";

function useSubmitEditQuiz(quiz: QuizExtended | null) {
  const { quizId } = useParams();
  const { isLoading, setIsLoading, error, setError } = useRequestState();
  const navigate = useNavigate();

  async function handleSubmit() {
    if (!quiz || !quizId) {
      return;
    }
    setIsLoading(true);
    try {
      const data = await updateQuiz(quizId, quiz);
      if (data.ok) {
        trackAnalyticsEvent("quiz_edit_saved", { quiz_id: quizId });
        navigate(`/quiz-list`);
      } else {
        trackAnalyticsEvent("quiz_edit_save_failed", {
          quiz_id: quizId,
          reason: "update_rejected",
        });
        setError("Update quiz failed");
      }
    } catch (error) {
      trackAnalyticsEvent("quiz_edit_save_failed", {
        quiz_id: quizId,
        reason: normalizeQuizAnalyticsReason(
          error instanceof Error ? error : "save_failed",
          "quiz_edit_save",
        ),
      });
      setError(error instanceof Error ? error.message : "Update quiz failed");
    } finally {
      setIsLoading(false);
    }
  }

  function handleCancel() {
    navigate(`/quiz-list`);
  }

  return { handleSubmit, handleCancel, isLoading, error };
}

export default useSubmitEditQuiz;
