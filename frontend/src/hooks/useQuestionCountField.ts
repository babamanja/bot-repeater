import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { QuizGenerationSettingsPreview } from "../api/quiz";

type GenerationSettings = QuizGenerationSettingsPreview["settings"];

type UseQuestionCountFieldOptions = {
  generationSettings: GenerationSettings | null;
  suggestedCount: number;
  syncFromSuggested?: boolean;
  requiredMessageKey?: string;
  rangeMessageKey?: string;
};

export function useQuestionCountField({
  generationSettings,
  suggestedCount,
  syncFromSuggested = true,
  requiredMessageKey = "upload.questionCountRequired",
  rangeMessageKey = "upload.questionCountRange",
}: UseQuestionCountFieldOptions) {
  const { t } = useTranslation();
  const [questionCountInput, setQuestionCountInput] = useState("");
  const [questionCountTouched, setQuestionCountTouched] = useState(false);
  const [committedQuestionCount, setCommittedQuestionCount] = useState<number | null>(null);

  const limits = useMemo(
    () => ({
      min: generationSettings?.minQuestions ?? 3,
      max: generationSettings?.maxQuestions ?? 100,
    }),
    [generationSettings],
  );

  const parsedQuestionCount = useMemo(() => {
    const trimmed = questionCountInput.trim();
    if (trimmed === "" || !/^\d+$/.test(trimmed)) {
      return null;
    }
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }, [questionCountInput]);

  const validationKey = useMemo(() => {
    if (!generationSettings) {
      return null;
    }
    const trimmed = questionCountInput.trim();
    if (trimmed === "") {
      return "required";
    }
    if (parsedQuestionCount === null) {
      return "invalid";
    }
    if (parsedQuestionCount < limits.min) {
      return "tooLow";
    }
    if (parsedQuestionCount > limits.max) {
      return "tooHigh";
    }
    return null;
  }, [generationSettings, questionCountInput, parsedQuestionCount, limits.min, limits.max]);

  const isValid = validationKey === null && generationSettings !== null;

  const shouldShowValidation = useMemo(() => {
    if (!validationKey) {
      return false;
    }
    if (validationKey === "required") {
      return questionCountTouched;
    }
    return questionCountInput.trim() !== "" || questionCountTouched;
  }, [validationKey, questionCountTouched, questionCountInput]);

  const errorMessage = useMemo(() => {
    if (!shouldShowValidation || !validationKey) {
      return null;
    }
    if (validationKey === "required") {
      return t(requiredMessageKey);
    }
    return t(rangeMessageKey, limits);
  }, [
    shouldShowValidation,
    validationKey,
    limits,
    t,
    requiredMessageKey,
    rangeMessageKey,
  ]);

  const effectiveQuestionCount =
    isValid && parsedQuestionCount !== null ? parsedQuestionCount : suggestedCount;

  useEffect(() => {
    if (!syncFromSuggested || !generationSettings || questionCountTouched) {
      return;
    }
    setQuestionCountInput(String(suggestedCount));
  }, [syncFromSuggested, generationSettings, suggestedCount, questionCountTouched]);

  useEffect(() => {
    if (!isValid || parsedQuestionCount === null) {
      return;
    }
    setCommittedQuestionCount(parsedQuestionCount);
  }, [isValid, parsedQuestionCount]);

  function handleChange(next: string) {
    if (next === "" || /^\d+$/.test(next)) {
      setQuestionCountInput(next);
    }
  }

  function handleBlur() {
    setQuestionCountTouched(true);
  }

  function markTouched() {
    setQuestionCountTouched(true);
  }

  function reset() {
    setQuestionCountInput("");
    setQuestionCountTouched(false);
    setCommittedQuestionCount(null);
  }

  function setInputValue(value: number) {
    setQuestionCountInput(String(value));
    setCommittedQuestionCount(value);
  }

  return {
    questionCountInput,
    handleChange,
    handleBlur,
    markTouched,
    reset,
    setInputValue,
    errorMessage,
    shouldShowValidation,
    validationKey,
    isValid,
    parsedQuestionCount,
    committedQuestionCount,
    effectiveQuestionCount,
    limits,
  };
}
