import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import { trackAnalyticsEvent } from "../../analytics";
import { getQuizById } from "../../api/quiz";
import QuizContainer from "../../components/Quiz/QuizContainer";
import Button from "../../components/UI/Button/Button";
import useSubmitQuizResult from "../../hooks/reqHooks/useSubmitQuizResult";
import useOptionClick from "../../hooks/useOptionClick";
import useToggle from "../../hooks/useToggle";
import { readLandingQuizProgress } from "../landing/hooks/landingQuizProgress";
import type { QuizExtended } from "../../types";
import EndQuizModal from "../modals/EndQuizModal";

import "../style.scss";

export default function QuizPage() {
  const { t } = useTranslation();
  const { quizId } = useParams();
  const landingProgress = useMemo(
    () => (quizId ? readLandingQuizProgress(quizId) : null),
    [quizId],
  );
  const [quiz, setQuiz] = useState<QuizExtended | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "error">("idle");
  const [loadError, setLoadError] = useState<string | null>(null);
  const { handleClick: baseHandleClick, selectedAnswers } = useOptionClick(
    quiz,
    landingProgress?.selectedAnswers,
  );
  const { value: openFinish, toggle: toggleOpenFinish } = useToggle(false);
  const { value: openQuit, toggle: toggleOpenQuit } = useToggle(false);
  const {
    handleSubmit,
    handleCancel,
    isLoading: isSubmitting,
  } = useSubmitQuizResult(quiz, selectedAnswers);

  useEffect(() => {
    let isCancelled = false;
    if (!quizId) {
      setLoadState("error");
      setLoadError(t("quiz.missingQuizId"));
      return;
    }
    setQuiz(null);
    setLoadState("loading");
    setLoadError(null);
    getQuizById(quizId)
      .then((data) => {
        if (isCancelled) {
          return;
        }
        setQuiz(data);
        setLoadState("idle");
      })
      .catch((err) => {
        if (isCancelled) {
          return;
        }
        setQuiz(null);
        setLoadState("error");
        setLoadError(err instanceof Error ? err.message : t("quiz.loadFailed"));
      });
    return () => {
      isCancelled = true;
    };
  }, [quizId, t]);

  useEffect(() => {
    if (!quiz) {
      return;
    }
    trackAnalyticsEvent("quiz_started", {
      quiz_id: quiz.id,
      question_count: quiz.questions.length,
    });
  }, [quiz]);

  function handleAnswerClick(questionId: string, answerId: string) {
    if (quiz) {
      trackAnalyticsEvent("quiz_answer_selected", {
        quiz_id: quiz.id,
        question_id: questionId,
      });
    }
    baseHandleClick(questionId, answerId);
  }

  async function handleConfirmSubmit() {
    if (quiz) {
      trackAnalyticsEvent("quiz_submit_confirmed", { quiz_id: quiz.id });
    }
    await handleSubmit();
  }

  if (loadState === "loading" || (loadState === "idle" && !quiz)) {
    return <p>{t("quiz.loading")}</p>;
  }
  if (loadState === "error" || !quiz) {
    return (
      <section>
        <p className="upload-file__error" role="alert">
          {loadError ?? t("quiz.loadFailed")}
        </p>
      </section>
    );
  }

  return (
    <section>
      <h1>{quiz.title}</h1>
      {landingProgress ? (
        <p className="quiz-page__resume-note">{t("quiz.landingResumeNote")}</p>
      ) : null}
      {quiz.questions.map((question) => (
        <QuizContainer
          key={question.id}
          quiz={quiz}
          questionId={question.id}
          state="test"
          selectedAnswerIds={
            selectedAnswers.find((entry) => entry.questionId === question.id)?.answerIds ?? []
          }
          onClick={(answerId) => handleAnswerClick(question.id, answerId)}
        />
      ))}
      <section className="quiz-page__buttons-container">
        <Button type="button" disabled={isSubmitting} onClick={toggleOpenFinish}>
          {isSubmitting ? t("quiz.checking") : t("quiz.check")}
        </Button>
        <Button type="button" disabled={isSubmitting} onClick={toggleOpenQuit} style="secondary">
          {t("quiz.back")}
        </Button>
      </section>
      <EndQuizModal
        open={openFinish}
        type="finish"
        onCancel={toggleOpenFinish}
        onSubmit={handleConfirmSubmit}
      />
      <EndQuizModal open={openQuit} type="quit" onCancel={toggleOpenQuit} onSubmit={handleCancel} />
    </section>
  );
}
