import { type FormEvent, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { trackAnalyticsEvent } from "../analytics";
import { type QualificationQuestion, submitMyQualification } from "../api/qualification";
import Button from "../components/UI/Button/Button";
import Page from "../components/UI/Page";
import PageHeader from "../components/UI/PageHeader";
import TextArea from "../components/UI/TextArea";

import "./style.scss";

type QualificationPageProps = {
  questions: QualificationQuestion[];
  onSubmitted: () => void;
  onSkip: () => void;
};

export default function QualificationPage({
  questions,
  onSubmitted,
  onSkip,
}: QualificationPageProps) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string | null>>({});
  const [freeTexts, setFreeTexts] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentQuestion = questions[currentIndex] ?? null;
  const isLastQuestion = currentIndex >= questions.length - 1;

  const canMoveNext = useMemo(() => {
    if (!currentQuestion) {
      return false;
    }
    const selected = selectedOptions[currentQuestion.id];
    const freeText = (freeTexts[currentQuestion.id] ?? "").trim();
    return Boolean(selected) || freeText.length > 0;
  }, [currentQuestion, freeTexts, selectedOptions]);

  async function handleSubmitAll() {
    if (!questions.length || isSaving) {
      return;
    }
    const payload = questions.map((question) => ({
      questionId: question.id,
      prompt: question.prompt,
      selectedOption: selectedOptions[question.id] ?? null,
      freeText: (freeTexts[question.id] ?? "").trim(),
    }));
    if (payload.some((item) => !item.selectedOption && !item.freeText)) {
      setError(t("qualification.answerRequired"));
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await submitMyQualification(payload);
      trackAnalyticsEvent("qualification_submitted", {});
      onSubmitted();
    } catch (error) {
      setError(error instanceof Error ? error.message : t("qualification.submitFailed"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canMoveNext || isSaving) {
      return;
    }
    setError(null);
    if (currentQuestion) {
      trackAnalyticsEvent("qualification_answered", {
        question_id: currentQuestion.id,
        question_index: currentIndex,
      });
    }
    if (isLastQuestion) {
      await handleSubmitAll();
      return;
    }
    setCurrentIndex((prev) => prev + 1);
  }

  if (!currentQuestion) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#fff",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      role="dialog"
      aria-modal="true"
      aria-label={t("qualification.title")}
    >
      <Page width="full" style={{ maxWidth: 760, width: "100%", margin: 0 }}>
        <PageHeader title={t("qualification.title")} subtitle={t("qualification.description")} />
        <p className="upload-file__subtitle">
          {t("qualification.progress", {
            current: currentIndex + 1,
            total: questions.length,
          })}
        </p>
        {error && <p className="upload-file__error upload-file__error--alert">{error}</p>}
        <form className="upload-file__form" onSubmit={handleSubmit}>
          <label className="upload-file__label">{currentQuestion.prompt}</label>
          <div style={{ display: "grid", gap: 8 }}>
            {currentQuestion.options.map((option) => {
              const checked = selectedOptions[currentQuestion.id] === option;
              return (
                <label key={`${currentQuestion.id}:${option}`} className="upload-file__label">
                  <input
                    type="radio"
                    name={`qualification-${currentQuestion.id}`}
                    value={option}
                    checked={checked}
                    onChange={() =>
                      setSelectedOptions((prev) => ({
                        ...prev,
                        [currentQuestion.id]: option,
                      }))
                    }
                    disabled={isSaving}
                  />{" "}
                  {option}
                </label>
              );
            })}
          </div>
          <label className="upload-file__label">
            {t("qualification.freeTextLabel")}
            <TextArea
              className="upload-file__textarea"
              rows={3}
              value={freeTexts[currentQuestion.id] ?? ""}
              onChange={(event) =>
                setFreeTexts((prev) => ({
                  ...prev,
                  [currentQuestion.id]: event.target.value,
                }))
              }
              disabled={isSaving}
              placeholder={t("qualification.freeTextPlaceholder")}
            />
          </label>
          <div className="upload-file__upload-control">
            {currentIndex > 0 && (
              <Button
                type="button"
                style="secondary"
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={isSaving}
              >
                {t("qualification.previous")}
              </Button>
            )}
            <Button type="submit" disabled={!canMoveNext || isSaving}>
              {isSaving
                ? t("upload.sending")
                : isLastQuestion
                  ? t("qualification.submit")
                  : t("qualification.next")}
            </Button>
            <Button type="button" style="secondary" onClick={onSkip} disabled={isSaving}>
              {t("qualification.skip")}
            </Button>
          </div>
        </form>
      </Page>
    </div>
  );
}
