import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import { trackAnalyticsEvent } from "../../analytics";
import type { Attempt } from "../../api/_types";
import { getQuizResults } from "../../api/attempt";
import QuizContainer from "../../components/Quiz/QuizContainer";
import ButtonLink from "../../components/UI/Button/ButtonLink";

export default function ShowAttemptPage() {
  const { t } = useTranslation();
  const { attemptId } = useParams();
  const [attemptData, setAttemptData] = useState<Attempt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    if (!attemptId) {
      setError(t("checkAnswers.attemptIdRequired"));
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    getQuizResults(attemptId)
      .then((data) => {
        if (isCancelled) {
          return;
        }
        setAttemptData(data);
        if (attemptId) {
          trackAnalyticsEvent("attempt_opened", {
            attempt_id: attemptId,
            quiz_id: data.quizId ?? undefined,
          });
        }
      })
      .catch((loadErr) => {
        if (isCancelled) {
          return;
        }
        setError(loadErr instanceof Error ? loadErr.message : t("checkAnswers.loadFailed"));
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      isCancelled = true;
    };
  }, [attemptId, t]);

  if (isLoading) {
    return <p>{t("quiz.loading")}</p>;
  }
  if (error) {
    return (
      <section>
        <p className="upload-file__error" role="alert">
          {error}
        </p>
        <section className="attempts-page__buttons-container">
          <ButtonLink to="/attempts" style="secondary">
            {t("attempts.back")}
          </ButtonLink>
        </section>
      </section>
    );
  }

  if (!attemptData?.questions?.length) {
    return (
      <section>
        <p>{t("checkAnswers.noResults")}</p>
        <section className="attempts-page__buttons-container">
          <ButtonLink to="/attempts" style="secondary">
            {t("attempts.back")}
          </ButtonLink>
        </section>
      </section>
    );
  }

  return (
    <section>
      {attemptData.questions.map((question) => (
        <QuizContainer
          key={question.id}
          quiz={{
            id: attemptData.quizId ?? "",
            title: attemptData.quizTitle ?? "",
            questions: attemptData.questions ?? [],
          }}
          questionId={question.id}
          selectedAnswerIds={
            attemptData.answers.find((answer) => answer.questionId === question.id)?.answerIds ??
            []
          }
          disabled={true}
          state="check"
        />
      ))}
      <section className="attempts-page__buttons-container">
        <ButtonLink to="/attempts" style="secondary">
          {t("attempts.back")}
        </ButtonLink>
        <ButtonLink
          to={`/quiz/${attemptData.quizId}`}
          onClick={() => {
            if (attemptId && attemptData.quizId) {
              trackAnalyticsEvent("attempt_retake_clicked", {
                attempt_id: attemptId,
                quiz_id: attemptData.quizId,
              });
            }
          }}
        >
          {t("attempts.takeAgain")}
        </ButtonLink>
      </section>
    </section>
  );
}
