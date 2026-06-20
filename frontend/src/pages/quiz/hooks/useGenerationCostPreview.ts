import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { trackAnalyticsEvent } from "../../../analytics";
import { getQuizGenerationSettings, type QuizGenerationSettingsPreview } from "../../../api/quiz";
import { getMySubscription } from "../../../api/subscription";
import { getMyTokens } from "../../../api/tokens";
import { OCR_IMAGE_TOKEN_COST } from "../../../config/ocr";
import { buildAppUploadProfile } from "../../../config/generationUploadProfile";
import { useQuestionCountField } from "../../../hooks/useQuestionCountField";
import { estimateChunkCount } from "../../../utils/estimateChunkCount";

type CostPreview = {
  summarizationTokens: number;
  quizGenerationTokens: number;
  totalEstimatedTokens: number;
};

type UseGenerationCostPreviewOptions = {
  trimmedText: string;
  charCount: number;
  activeTextLength: number;
  pastedTextLength: number;
  uploadedTextLength: number;
  setError: (error: string | null) => void;
  setRequiredTokens: (tokens: number | null) => void;
};

export function useGenerationCostPreview({
  trimmedText,
  charCount,
  activeTextLength,
  pastedTextLength,
  uploadedTextLength,
  setError,
  setRequiredTokens,
}: UseGenerationCostPreviewOptions) {
  const { t } = useTranslation();
  const [generationSettings, setGenerationSettings] = useState<
    QuizGenerationSettingsPreview["settings"] | null
  >(null);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [effectivePlanCode, setEffectivePlanCode] = useState<"basic" | "premium" | null>(null);
  const [costPreview, setCostPreview] = useState<CostPreview | null>(null);
  const [costPreviewLoading, setCostPreviewLoading] = useState(false);

  const isPremiumPlan = effectivePlanCode === "premium";
  const isPlanKnown = effectivePlanCode !== null;
  const isBasicPlan = isPlanKnown && !isPremiumPlan;

  useEffect(() => {
    getQuizGenerationSettings("")
      .then((data) => {
        setGenerationSettings(data.settings);
      })
      .catch(() => {
        setGenerationSettings(null);
      });
  }, []);

  useEffect(() => {
    let isMounted = true;

    Promise.all([getMyTokens(), getMySubscription()])
      .then(([tokensData, subscriptionData]) => {
        if (!isMounted) {
          return;
        }
        setTokenBalance(tokensData.balance);
        setEffectivePlanCode(subscriptionData.effectivePlanCode);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        setTokenBalance(null);
        setEffectivePlanCode("basic");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const chunkCount = useMemo(() => {
    if (!generationSettings || !trimmedText) {
      return 0;
    }
    return estimateChunkCount(
      charCount,
      generationSettings.chunkSizeChars,
      generationSettings.chunkOverlapChars,
    );
  }, [generationSettings, trimmedText, charCount]);

  const chunkSizeChars = generationSettings?.chunkSizeChars ?? 12_000;
  const suggestedQuestionsPerChunk = generationSettings?.questionsPerChunk ?? 8;

  const uploadProfile = useMemo(
    () => buildAppUploadProfile(isPremiumPlan),
    [isPremiumPlan],
  );
  const maxUploadBytes = uploadProfile.maxBytes;
  const maxTextChars = uploadProfile.maxTextChars;

  const ocrImageTokenCost = useMemo(() => {
    const value = generationSettings?.tokensPerOcrImage;
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return Math.floor(value);
    }
    return OCR_IMAGE_TOKEN_COST;
  }, [generationSettings]);

  const isPastedTextOverLimit = pastedTextLength > maxTextChars;
  const isUploadedTextOverLimit = uploadedTextLength > maxTextChars;
  const isActiveTextOverLimit = activeTextLength > maxTextChars;

  const questionCountField = useQuestionCountField({
    generationSettings,
    suggestedCount: suggestedQuestionsPerChunk,
    requiredMessageKey: "upload.questionsPerChunkRequired",
    rangeMessageKey: "upload.questionsPerChunkRange",
  });

  const isQuestionCountBlocking =
    isPremiumPlan && Boolean(trimmedText) && !questionCountField.isValid;

  useEffect(() => {
    if (!trimmedText || isActiveTextOverLimit || !questionCountField.isValid) {
      setCostPreview(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setCostPreviewLoading(true);
      getQuizGenerationSettings(trimmedText, {
        questionCount: questionCountField.effectiveQuestionCount,
      })
        .then((data) => {
          if (cancelled) {
            return;
          }
          setGenerationSettings(data.settings);
          setCostPreview({
            summarizationTokens: data.summarizationTokens,
            quizGenerationTokens: data.quizGenerationTokens,
            totalEstimatedTokens: data.totalEstimatedTokens,
          });
        })
        .catch(() => {
          if (!cancelled) {
            setCostPreview(null);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setCostPreviewLoading(false);
          }
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    trimmedText,
    isActiveTextOverLimit,
    questionCountField.effectiveQuestionCount,
    questionCountField.isValid,
  ]);

  const estimatedTotalQuestions = useMemo(() => {
    if (!generationSettings) {
      return suggestedQuestionsPerChunk;
    }
    if (!trimmedText) {
      return generationSettings.defaultQuestions;
    }
    const raw = Math.round(chunkCount * questionCountField.effectiveQuestionCount);
    return Math.min(
      generationSettings.maxQuestions,
      Math.max(generationSettings.minQuestions, raw),
    );
  }, [
    generationSettings,
    trimmedText,
    chunkCount,
    questionCountField.effectiveQuestionCount,
    suggestedQuestionsPerChunk,
  ]);

  const totalEstimatedTokens = costPreview?.totalEstimatedTokens ?? 0;
  const summarizationTokens = costPreview?.summarizationTokens ?? 0;

  const hasEnoughTokens =
    tokenBalance === null ||
    !trimmedText ||
    (costPreview !== null && totalEstimatedTokens <= tokenBalance);

  const hasEnoughTokensForUpload =
    tokenBalance === null ||
    !trimmedText ||
    (costPreview !== null && summarizationTokens <= tokenBalance);

  const handleTextLimitError = useCallback(
    (message: string): boolean => {
      if (message.startsWith("TEXT_TOO_LONG:")) {
        const maxRaw = message.split(":")[1];
        const max = Number(maxRaw);
        setError(
          t("upload.textCharLimitExceeded", {
            max: Number.isInteger(max) ? max.toLocaleString() : maxTextChars.toLocaleString(),
          }),
        );
        return true;
      }
      if (message === "fullText is too large") {
        setError(t("upload.textCharLimitExceeded", { max: maxTextChars.toLocaleString() }));
        return true;
      }
      return false;
    },
    [maxTextChars, setError, t],
  );

  const handleUploadTokenError = useCallback(
    (message: string, requestId: string) => {
      if (message.startsWith("INSUFFICIENT_TOKEN_BALANCE:")) {
        const requiredRaw = message.split(":")[1];
        const required = Number(requiredRaw);
        const shownRequired = Number.isInteger(required) ? required : undefined;
        setRequiredTokens(Number.isInteger(required) ? required : null);
        trackAnalyticsEvent("tokens_insufficient_shown", {
          request_id: requestId,
          required_tokens: shownRequired,
          estimated_tokens: summarizationTokens,
        });
        setError(
          `${t("upload.insufficientTokensTitle")}${Number.isInteger(required) ? ` (${required})` : ""}`,
        );
        return;
      }
      if (message === "AUTH_REQUIRED_FOR_TOKEN_BILLING") {
        setError(t("upload.authRequired"));
        return;
      }
      if (message === "premium_required") {
        setError(t("upload.uploadDocumentPremiumRequired"));
        return;
      }
      if (handleTextLimitError(message)) {
        return;
      }
      setError(message);
    },
    [handleTextLimitError, setError, setRequiredTokens, summarizationTokens, t],
  );

  return {
    generationSettings,
    tokenBalance,
    setTokenBalance,
    effectivePlanCode,
    isPremiumPlan,
    isPlanKnown,
    isBasicPlan,
    costPreview,
    costPreviewLoading,
    chunkCount,
    chunkSizeChars,
    suggestedQuestionsPerChunk,
    uploadProfile,
    maxUploadBytes,
    maxTextChars,
    ocrImageTokenCost,
    isPastedTextOverLimit,
    isUploadedTextOverLimit,
    isActiveTextOverLimit,
    questionCountField,
    isQuestionCountBlocking,
    estimatedTotalQuestions,
    totalEstimatedTokens,
    summarizationTokens,
    hasEnoughTokens,
    hasEnoughTokensForUpload,
    handleTextLimitError,
    handleUploadTokenError,
  };
}
