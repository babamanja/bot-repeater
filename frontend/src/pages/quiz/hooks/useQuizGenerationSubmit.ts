import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import {
  createRequestId,
  normalizeQuizAnalyticsReason,
  trackAnalyticsEvent,
} from "../../../analytics";
import { createDocument, type DocumentSourceType } from "../../../api/document";
import { generateQuiz, type QuizGenerationSettingsPreview } from "../../../api/quiz";
import type { useQuestionCountField } from "../../../hooks/useQuestionCountField";

type BusyAction = null | "parse" | "generate" | "upload";

type CostPreview = {
  summarizationTokens: number;
  totalEstimatedTokens: number;
} | null;

type QuestionCountField = ReturnType<typeof useQuestionCountField>;

type UseQuizGenerationSubmitOptions = {
  trimmedText: string;
  sourceTab: "upload" | "paste";
  sourceType: DocumentSourceType;
  files: File[];
  quizLanguage: string;
  isActiveTextOverLimit: boolean;
  isPremiumPlan: boolean;
  isBasicPlan: boolean;
  generationSettings: QuizGenerationSettingsPreview["settings"] | null;
  costPreview: CostPreview;
  suggestedQuestionsPerChunk: number;
  totalEstimatedTokens: number;
  questionCountField: QuestionCountField;
  isQuestionCountBlocking: boolean;
  setError: (error: string | null) => void;
  setRequiredTokens: (tokens: number | null) => void;
  setBusyAction: (action: BusyAction) => void;
  handleTextLimitError: (message: string) => boolean;
  handleUploadTokenError: (message: string, requestId: string) => void;
  onOpenUpgradeSubscription: () => void;
};

export function useQuizGenerationSubmit({
  trimmedText,
  sourceTab,
  sourceType,
  files,
  quizLanguage,
  isActiveTextOverLimit,
  isPremiumPlan,
  isBasicPlan,
  generationSettings,
  costPreview,
  suggestedQuestionsPerChunk,
  totalEstimatedTokens,
  questionCountField,
  isQuestionCountBlocking,
  setError,
  setRequiredTokens,
  setBusyAction,
  handleTextLimitError,
  handleUploadTokenError,
  onOpenUpgradeSubscription,
}: UseQuizGenerationSubmitOptions) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const createDocumentFromInput = useCallback(
    async (options?: { saveOnly?: boolean }) => {
      const activeSourceType = sourceTab === "paste" ? "text" : sourceType;
      const doc = await createDocument({
        title: sourceTab === "upload" ? files[0]?.name : undefined,
        sourceType: activeSourceType,
        fullText: trimmedText,
        language: quizLanguage,
        saveOnly: options?.saveOnly,
      });
      if (doc.document.status === "failed") {
        throw new Error(doc.document.errorMessage ?? t("upload.uploadDocumentFailed"));
      }
      return doc;
    },
    [files, quizLanguage, sourceTab, sourceType, t, trimmedText],
  );

  const handleUploadDocument = useCallback(async () => {
    if (!trimmedText || isActiveTextOverLimit || !costPreview) {
      return;
    }
    if (isQuestionCountBlocking) {
      questionCountField.markTouched();
      return;
    }
    setError(null);
    setRequiredTokens(null);
    setBusyAction("upload");
    const requestId = createRequestId();
    try {
      await createDocumentFromInput({ saveOnly: true });
      navigate("/documents");
    } catch (err) {
      const message = err instanceof Error ? err.message : t("upload.requestFailed");
      handleUploadTokenError(message, requestId);
    } finally {
      setBusyAction(null);
    }
  }, [
    costPreview,
    createDocumentFromInput,
    handleUploadTokenError,
    isActiveTextOverLimit,
    isQuestionCountBlocking,
    navigate,
    questionCountField,
    setBusyAction,
    setError,
    setRequiredTokens,
    t,
    trimmedText,
  ]);

  const handleUploadDocumentClick = useCallback(() => {
    if (isBasicPlan) {
      onOpenUpgradeSubscription();
      return;
    }
    void handleUploadDocument();
  }, [handleUploadDocument, isBasicPlan, onOpenUpgradeSubscription]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isActiveTextOverLimit) {
        return;
      }
      if (
        isPremiumPlan &&
        (!questionCountField.isValid || questionCountField.parsedQuestionCount === null)
      ) {
        questionCountField.markTouched();
        return;
      }
      if (!generationSettings) {
        return;
      }
      setError(null);
      setRequiredTokens(null);
      setBusyAction("generate");
      const requestId = createRequestId();
      let questionCount = suggestedQuestionsPerChunk;
      if (isPremiumPlan && questionCountField.parsedQuestionCount !== null) {
        questionCount = questionCountField.parsedQuestionCount;
      }
      trackAnalyticsEvent("quiz_generation_started", {
        request_id: requestId,
        question_count: questionCount,
        estimated_tokens: totalEstimatedTokens,
        source: sourceTab === "upload" ? "upload" : "paste",
        quiz_language: quizLanguage,
      });
      try {
        const doc = await createDocumentFromInput();
        if (doc.chunks.length === 0) {
          throw new Error(t("upload.generateFailed"));
        }

        const readyChunks = doc.chunks.filter(
          (chunk) => chunk.status === "summarized" && Boolean(chunk.summary?.trim()),
        );
        if (readyChunks.length === 0) {
          throw new Error(t("upload.generateFailed"));
        }

        const data = await generateQuiz({
          documentId: doc.document.id,
          questionCount,
          language: quizLanguage,
        });
        const startedQuizzes =
          data.quizzes && data.quizzes.length > 0 ? data.quizzes : data.id ? [data] : [];
        if (startedQuizzes.length === 0 || data.status !== "generating") {
          throw new Error(t("upload.generateFailed"));
        }
        const primaryQuizId = startedQuizzes[0]?.id ?? data.id;
        trackAnalyticsEvent("quiz_generation_succeeded", {
          request_id: requestId,
          quiz_id: primaryQuizId,
          question_count: data.questionCount,
          estimated_tokens: data.totalTokensCharged ?? data.tokensCharged,
          source: sourceTab === "upload" ? "upload" : "paste",
          quiz_language: data.language,
        });
        navigate("/quiz-list", { state: { highlightQuizId: primaryQuizId } });
      } catch (err) {
        const message = err instanceof Error ? err.message : t("upload.requestFailed");
        if (message.startsWith("INSUFFICIENT_TOKEN_BALANCE:")) {
          const requiredRaw = message.split(":")[1];
          const required = Number(requiredRaw);
          const shownRequired = Number.isInteger(required) ? required : undefined;
          setRequiredTokens(Number.isInteger(required) ? required : null);
          trackAnalyticsEvent("tokens_insufficient_shown", {
            request_id: requestId,
            required_tokens: shownRequired,
            question_count: questionCount,
            estimated_tokens: totalEstimatedTokens,
          });
        }
        trackAnalyticsEvent("quiz_generation_failed", {
          request_id: requestId,
          reason: normalizeQuizAnalyticsReason(message, "quiz_generation"),
          question_count: questionCount,
          estimated_tokens: totalEstimatedTokens,
          source: sourceTab === "upload" ? "upload" : "paste",
        });
        if (message === "AUTH_REQUIRED_FOR_TOKEN_BILLING") {
          setError(t("upload.authRequired"));
        } else if (message.startsWith("INSUFFICIENT_TOKEN_BALANCE:")) {
          const requiredRaw = message.split(":")[1];
          const required = Number(requiredRaw);
          setError(
            `${t("upload.insufficientTokensTitle")}${Number.isInteger(required) ? ` (${required})` : ""}`,
          );
        } else if (handleTextLimitError(message)) {
          // handled
        } else {
          setError(message);
        }
      } finally {
        setBusyAction(null);
      }
    },
    [
      createDocumentFromInput,
      generationSettings,
      handleTextLimitError,
      isActiveTextOverLimit,
      isPremiumPlan,
      navigate,
      questionCountField,
      quizLanguage,
      setBusyAction,
      setError,
      setRequiredTokens,
      sourceTab,
      suggestedQuestionsPerChunk,
      t,
      totalEstimatedTokens,
    ],
  );

  return {
    handleSubmit,
    handleUploadDocument,
    handleUploadDocumentClick,
  };
}
