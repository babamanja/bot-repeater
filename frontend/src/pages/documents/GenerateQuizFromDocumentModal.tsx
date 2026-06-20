import { useEffect, useState } from "react";

import { useTranslation } from "react-i18next";



import {

  getDocumentGenerationPreview,

  type DocumentChunkDetail,

} from "../../api/document";

import { generateQuiz, type QuizGenerationSettingsPreview } from "../../api/quiz";

import { getMyTokens } from "../../api/tokens";

import Button from "../../components/UI/Button/Button";

import Modal from "../../components/UI/Modal";

import {

  DEFAULT_QUIZ_LANGUAGE_CODE,

  QUIZ_LANGUAGE_CODES,

  type QuizLanguageCode,

} from "../../config/quizLanguages";

import { useQuestionCountField } from "../../hooks/useQuestionCountField";
import { getChunkDisplayTitle } from "../../utils/chunkDisplayTitle";



type GenerateQuizFromDocumentModalProps = {

  open: boolean;

  documentId: string;

  chunk: DocumentChunkDetail | null;

  onClose: () => void;

  onGenerated: (quizId: string) => void;

};



export default function GenerateQuizFromDocumentModal({

  open,

  documentId,

  chunk,

  onClose,

  onGenerated,

}: GenerateQuizFromDocumentModalProps) {

  const { t } = useTranslation();

  const [generationSettings, setGenerationSettings] = useState<

    QuizGenerationSettingsPreview["settings"] | null

  >(null);

  const [quizLanguage, setQuizLanguage] = useState<QuizLanguageCode>(DEFAULT_QUIZ_LANGUAGE_CODE);

  const [estimatedTokens, setEstimatedTokens] = useState<number | null>(null);

  const [tokenBalance, setTokenBalance] = useState<number | null>(null);

  const [previewLoading, setPreviewLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);



  const questionCountField = useQuestionCountField({

    generationSettings,

    suggestedCount: generationSettings?.defaultQuestions ?? 10,

    syncFromSuggested: false,

    requiredMessageKey: "documents.generateModal.questionCountRequired",

    rangeMessageKey: "documents.generateModal.questionCountRange",

  });



  const hasEnoughTokens =

    tokenBalance === null ||

    estimatedTokens === null ||

    estimatedTokens <= tokenBalance;



  useEffect(() => {

    if (!open || !chunk) {

      return;

    }

    setError(null);

    questionCountField.reset();

    setQuizLanguage(DEFAULT_QUIZ_LANGUAGE_CODE);

    setGenerationSettings(null);

    setEstimatedTokens(null);

    setTokenBalance(null);

  }, [open, chunk?.id]);



  useEffect(() => {

    if (!open) {

      return;

    }

    getMyTokens()

      .then((data) => {

        setTokenBalance(data.balance);

      })

      .catch(() => {

        setTokenBalance(null);

      });

  }, [open]);



  useEffect(() => {

    if (!open || !chunk) {

      return;

    }

    let cancelled = false;

    setPreviewLoading(true);

    getDocumentGenerationPreview(documentId, chunk.id, {

      questionCount: questionCountField.committedQuestionCount ?? undefined,

    })

      .then((preview) => {

        if (cancelled) {

          return;

        }

        setGenerationSettings(preview.settings);

        setEstimatedTokens(preview.estimatedTokens);

        if (questionCountField.committedQuestionCount === null) {

          questionCountField.setInputValue(preview.estimatedQuestions);

        }

      })

      .catch((previewError) => {

        if (cancelled) {

          return;

        }

        setError(

          previewError instanceof Error

            ? previewError.message

            : t("documents.generateModal.previewFailed"),

        );

      })

      .finally(() => {

        if (!cancelled) {

          setPreviewLoading(false);

        }

      });

    return () => {

      cancelled = true;

    };

  }, [open, documentId, chunk, questionCountField.committedQuestionCount, t]);



  async function handleSubmit() {

    if (!chunk || !questionCountField.isValid || questionCountField.parsedQuestionCount === null) {

      questionCountField.markTouched();

      return;

    }

    setError(null);

    setSubmitting(true);

    try {

      const data = await generateQuiz({

        documentId,

        chunkId: chunk.id,

        questionCount: questionCountField.parsedQuestionCount,

        language: quizLanguage,

      });

      if (!data.id || data.status !== "generating") {

        throw new Error(t("documents.detail.generateFailed"));

      }

      onGenerated(data.id);

      onClose();

    } catch (submitError) {

      const message =

        submitError instanceof Error

          ? submitError.message

          : t("documents.detail.generateFailed");

      if (message.startsWith("INSUFFICIENT_TOKEN_BALANCE:")) {

        const requiredRaw = message.split(":")[1];

        const required = Number(requiredRaw);

        setError(

          `${t("documents.generateModal.insufficientTokens")}${

            Number.isInteger(required) ? ` (${required})` : ""

          }`,

        );

      } else {

        setError(message);

      }

    } finally {

      setSubmitting(false);

    }

  }



  if (!chunk) {

    return null;

  }



  return (

    <Modal

      open={open}

      buttons={

        <>

          <Button

            onClick={handleSubmit}

            style="primary"

            disabled={

              previewLoading ||

              submitting ||

              estimatedTokens === null ||

              !questionCountField.isValid ||

              !hasEnoughTokens

            }

          >

            {submitting ? t("upload.sending") : t("documents.generateModal.submit")}

          </Button>

          <Button onClick={onClose} style="secondary" disabled={submitting}>

            {t("documents.generateModal.cancel")}

          </Button>

        </>

      }

    >

      <div className="generate-quiz-modal">

        <h2 className="generate-quiz-modal__title">{t("documents.generateModal.title")}</h2>

        <p className="generate-quiz-modal__subtitle">

          {t("documents.generateModal.subtitle", {
            label: getChunkDisplayTitle(
              chunk,
              t("documents.detail.summaryItemFallback", {
                index: chunk.chunkIndex + 1,
              }),
            ),
          })}

        </p>



        {error ? (

          <p className="upload-file__error upload-file__error--alert" role="alert">

            {error}

          </p>

        ) : null}



        <label className="upload-file__label" htmlFor="generate-quiz-language">

          {t("upload.quizLanguageLabel")}

        </label>

        <select

          id="generate-quiz-language"

          className="upload-file__input upload-file__select generate-quiz-modal__field"

          value={quizLanguage}

          onChange={(event) => setQuizLanguage(event.target.value as QuizLanguageCode)}

          disabled={submitting}

        >

          {QUIZ_LANGUAGE_CODES.map((code) => (

            <option key={code} value={code}>

              {t(`upload.languages.${code}`)}

            </option>

          ))}

        </select>



        <label className="upload-file__label" htmlFor="generate-quiz-question-count">

          {t("upload.questionCountLabel")}

        </label>

        <input

          id="generate-quiz-question-count"

          className="upload-file__input generate-quiz-modal__field"

          type="text"

          inputMode="numeric"

          autoComplete="off"

          value={questionCountField.questionCountInput}

          onChange={(event) => questionCountField.handleChange(event.target.value)}

          onBlur={questionCountField.handleBlur}

          aria-invalid={Boolean(questionCountField.errorMessage)}

          disabled={submitting || previewLoading}

        />

        {questionCountField.errorMessage ? (

          <p className="upload-file__error" role="alert">

            {questionCountField.errorMessage}

          </p>

        ) : null}



        <p

          className={`generate-quiz-modal__tokens${

            tokenBalance !== null && estimatedTokens !== null && !hasEnoughTokens

              ? " generate-quiz-modal__tokens--insufficient"

              : ""

          }`}

          role="status"

        >

          {previewLoading

            ? t("documents.generateModal.tokensLoading")

            : tokenBalance !== null && estimatedTokens !== null

              ? t("documents.generateModal.tokensCostWithBalance", {

                  cost: estimatedTokens,

                  balance: tokenBalance,

                })

              : t("documents.generateModal.tokensCost", {

                  count: estimatedTokens ?? "—",

                })}

        </p>

        {tokenBalance !== null && estimatedTokens !== null && !hasEnoughTokens ? (

          <p className="upload-file__error" role="alert">

            {t("documents.generateModal.insufficientTokensInline", {

              cost: estimatedTokens,

              balance: tokenBalance,

            })}

          </p>

        ) : null}

      </div>

    </Modal>

  );

}

