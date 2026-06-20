import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import QuizContainer from "../../components/Quiz/QuizContainer";
import Button from "../../components/UI/Button/Button";
import TextInput from "../../components/UI/TextInput";
import QuizEditProvider from "../../context/QuizEditContext";
import { useQuizEditContext } from "../../context/useQuizEditContext";
import useSubmitEditQuiz from "../../hooks/reqHooks/useSubmitEditQuiz";

function EditQuizContent() {
  const { t } = useTranslation();
  const { quiz, updateTitle, isLoading, error } = useQuizEditContext();
  const {
    handleSubmit,
    handleCancel,
    isLoading: isSubmitting,
    error: submitError,
  } = useSubmitEditQuiz(quiz);

  if (error) {
    return <p role="alert">{error}</p>;
  }
  if (isLoading && !quiz) {
    return <p>{t("quiz.loading")}</p>;
  }

  return (
    <section>
      <h1>{t("editQuiz.title")}</h1>
      <TextInput
        value={quiz?.title ?? ""}
        onChange={updateTitle}
        label={t("editQuiz.titleLabel")}
      />
      {quiz?.questions.map((question) => (
        <QuizContainer key={question.id} questionId={question.id} disabled={false} state="edit" />
      ))}
      {submitError ? (
        <p className="upload-file__error" role="alert">
          {submitError}
        </p>
      ) : null}
      <section className="quiz-page__buttons-container">
        <Button onClick={handleSubmit} disabled={isSubmitting} style="primary">
          {t("editQuiz.save")}
        </Button>
        <Button onClick={handleCancel} disabled={isSubmitting} style="secondary">
          {t("editQuiz.cancel")}
        </Button>
      </section>
    </section>
  );
}

export default function EditQuizPage() {
  const { t } = useTranslation();
  const { quizId } = useParams();
  const id = quizId ?? "";

  if (!id) {
    return <p>{t("quiz.missingQuizId")}</p>;
  }

  return (
    <QuizEditProvider quizId={id}>
      <EditQuizContent />
    </QuizEditProvider>
  );
}
