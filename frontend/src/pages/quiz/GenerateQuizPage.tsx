import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import type { DocumentSourceType } from "../../api/document";
import Button from "../../components/UI/Button/Button";
import Card from "../../components/UI/Card";
import Page from "../../components/UI/Page";
import PageHeader from "../../components/UI/PageHeader";
import UpgradeModal from "../../components/payments/UpgradeModal";
import UpgradeSubscriptionModal from "../../components/payments/UpgradeSubscriptionModal";
import TextArea from "../../components/UI/TextArea";
import UploadFile from "../../components/UI/UploadFile";
import {
  DEFAULT_QUIZ_LANGUAGE_CODE,
  QUIZ_LANGUAGE_CODES,
  type QuizLanguageCode,
} from "../../config/quizLanguages";
import OcrConfirmModal from "./OcrConfirmModal";
import OcrRemoveWarningModal from "./OcrRemoveWarningModal";
import PdfOcrConfirmModal from "./PdfOcrConfirmModal";
import PdfOcrProgressModal from "./PdfOcrProgressModal";
import PdfPageSelectModal from "./PdfPageSelectModal";
import { useGenerationCostPreview } from "./hooks/useGenerationCostPreview";
import { usePdfOcrFlow } from "./hooks/usePdfOcrFlow";
import { useQuizGenerationSubmit } from "./hooks/useQuizGenerationSubmit";

import "../style.scss";

type BusyAction = null | "parse" | "generate" | "upload";

const GenerateQuizPage = () => {
  const { t } = useTranslation();
  const [pastedText, setPastedText] = useState("");
  const [uploadedText, setUploadedText] = useState("");
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const loading = busyAction !== null;
  const [error, setError] = useState<string | null>(null);
  const [requiredTokens, setRequiredTokens] = useState<number | null>(null);
  const [sourceTab, setSourceTab] = useState<"upload" | "paste">("upload");
  const [sourceType, setSourceType] = useState<DocumentSourceType>("text");
  const [quizLanguage, setQuizLanguage] = useState<QuizLanguageCode>(DEFAULT_QUIZ_LANGUAGE_CODE);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeSubscriptionModalOpen, setUpgradeSubscriptionModalOpen] = useState(false);

  const activeText = sourceTab === "upload" ? uploadedText : pastedText;
  const trimmedText = activeText.trim();
  const charCount = trimmedText.length;

  const costPreviewState = useGenerationCostPreview({
    trimmedText,
    charCount,
    activeTextLength: activeText.length,
    pastedTextLength: pastedText.length,
    uploadedTextLength: uploadedText.length,
    setError,
    setRequiredTokens,
  });

  const {
    generationSettings,
    tokenBalance,
    setTokenBalance,
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
  } = costPreviewState;

  const onTextExtracted = useCallback(
    (text: string, options: { fromOcr: boolean; sourceType?: DocumentSourceType }) => {
      setUploadedText(text);
      if (options.sourceType) {
        setSourceType(options.sourceType);
      }
    },
    [],
  );

  const clearUploadedText = useCallback(() => {
    setUploadedText("");
  }, []);

  const pdfOcr = usePdfOcrFlow({
    t,
    uploadProfile,
    setBusyAction,
    setError,
    setRequiredTokens,
    setTokenBalance,
    onUploadTokenError: handleUploadTokenError,
    onTextExtracted,
  });

  const { handleSubmit, handleUploadDocument, handleUploadDocumentClick } = useQuizGenerationSubmit({
    trimmedText,
    sourceTab,
    sourceType,
    files: pdfOcr.files,
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
    onOpenUpgradeSubscription: () => setUpgradeSubscriptionModalOpen(true),
  });

  const canUploadDocumentFromOcrWarning =
    Boolean(uploadedText.trim()) &&
    !isUploadedTextOverLimit &&
    !loading &&
    !(isPlanKnown && !isPremiumPlan) &&
    !costPreviewLoading &&
    Boolean(costPreview) &&
    hasEnoughTokensForUpload &&
    !isQuestionCountBlocking;

  return (
    <Page width="full">
      <PageHeader title={t("upload.title")} subtitle={t("upload.pageSubtitle")} />

      <Card as="section">
        <form onSubmit={handleSubmit} className="upload-file__form">
          <div className="upload-file__source-tabs" role="tablist" aria-label={t("upload.sourcePickerLabel")}>
            <button
              type="button"
              role="tab"
              id="upload-tab-upload"
              aria-selected={sourceTab === "upload"}
              aria-controls="upload-tab-panel"
              className={`upload-file__source-tab${sourceTab === "upload" ? " upload-file__source-tab--active" : ""}`}
              onClick={() => setSourceTab("upload")}
            >
              <span className="upload-file__source-tab-icon" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 15V3m0 0l4 4m-4-4L8 7M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              {t("upload.tabUpload")}
            </button>
            <button
              type="button"
              role="tab"
              id="upload-tab-paste"
              aria-selected={sourceTab === "paste"}
              aria-controls="upload-tab-panel"
              className={`upload-file__source-tab${sourceTab === "paste" ? " upload-file__source-tab--active" : ""}`}
              onClick={() => {
                setSourceTab("paste");
                setSourceType("text");
              }}
            >
              <span className="upload-file__source-tab-icon" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 12h6m-6 4h6M7 4h7l3 3v13a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              {t("upload.tabPaste")}
            </button>
          </div>

          <div className="upload-file__tab-panel-container">
            <div
              id="upload-tab-panel"
              role="tabpanel"
              aria-labelledby={sourceTab === "upload" ? "upload-tab-upload" : "upload-tab-paste"}
              className="upload-file__tab-panel"
            >
              {sourceTab === "upload" ? (
                <>
                  <UploadFile
                    onFileChange={pdfOcr.handleFileChange}
                    disabled={
                      loading ||
                      pdfOcr.pendingOcrFile !== null ||
                      pdfOcr.pendingPageSelection !== null ||
                      pdfOcr.pendingPdfOcrJob !== null ||
                      pdfOcr.activePdfOcrJob !== null
                    }
                    maxBytes={maxUploadBytes}
                  />
                  {busyAction === "parse" ? (
                    <p className="upload-file__char-hint" role="status">
                      {t("upload.extractingText")}
                    </p>
                  ) : null}
                  {pdfOcr.files.length > 0 ? (
                    <ul className="upload-file__files-list">
                      {pdfOcr.files.map((f) => (
                        <li key={f.name} className="upload-file__file-item">
                          <span className="upload-file__file-name">{f.name}</span>
                          <Button
                            onClick={() =>
                              pdfOcr.requestRemoveFile(
                                f.name,
                                Boolean(uploadedText.trim()),
                                clearUploadedText,
                              )
                            }
                            style="secondary"
                            type="button"
                          >
                            {t("upload.removeFile")}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <div
                    className={`upload-file__text-section${
                      uploadedText.trim() ? " upload-file__text-section--open" : ""
                    }`}
                  >
                    <div className="upload-file__text-section-inner">
                      <label className="upload-file__label" htmlFor="uploaded-source">
                        {t("upload.uploadedTextLabel")}
                      </label>
                      <TextArea
                        id="uploaded-source"
                        className="upload-file__textarea"
                        value={uploadedText}
                        onChange={(e) => {
                          pdfOcr.clearExtractNotice();
                          setUploadedText(e.target.value);
                        }}
                        rows={8}
                        placeholder={t("upload.uploadedTextPlaceholder")}
                        disabled={loading}
                        aria-describedby="uploaded-source-char-counter"
                      />
                      <p
                        id="uploaded-source-char-counter"
                        className={`upload-file__char-hint upload-file__text-char-counter${
                          isUploadedTextOverLimit ? " upload-file__text-char-counter--at-limit" : ""
                        }`}
                      >
                        {t("upload.textCharCounter", {
                          current: uploadedText.length.toLocaleString(),
                          max: maxTextChars.toLocaleString(),
                        })}
                      </p>
                      {isUploadedTextOverLimit ? (
                        <p className="upload-file__error" role="alert">
                          {t("upload.textCharLimitExceeded", {
                            max: maxTextChars.toLocaleString(),
                          })}
                        </p>
                      ) : null}
                      {pdfOcr.extractNotice ? (
                        <p className="upload-file__char-hint" role="status">
                          {pdfOcr.extractNotice}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="upload-file__text-section upload-file__text-section--open">
                    <div className="upload-file__text-section-inner">
                      <label className="upload-file__label" htmlFor="pasted-source">
                        {t("upload.label")}
                      </label>
                      <TextArea
                        id="pasted-source"
                        className="upload-file__textarea"
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        rows={8}
                        placeholder={t("upload.placeholder")}
                        disabled={loading}
                        aria-describedby="pasted-source-char-counter"
                      />
                      <p
                        id="pasted-source-char-counter"
                        className={`upload-file__char-hint upload-file__text-char-counter${
                          isPastedTextOverLimit ? " upload-file__text-char-counter--at-limit" : ""
                        }`}
                      >
                        {t("upload.textCharCounter", {
                          current: pastedText.length.toLocaleString(),
                          max: maxTextChars.toLocaleString(),
                        })}
                      </p>
                      {isPastedTextOverLimit ? (
                        <p className="upload-file__error" role="alert">
                          {t("upload.textCharLimitExceeded", {
                            max: maxTextChars.toLocaleString(),
                          })}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div
              className={`upload-file__form-sidebar${
                trimmedText ? " upload-file__form-sidebar--open" : ""
              }`}
              aria-hidden={!trimmedText}
            >
              <div className="upload-file__form-sidebar-inner">
                <label className="upload-file__label" htmlFor="quiz-language">
                  {t("upload.quizLanguageLabel")}
                </label>
                <select
                  id="quiz-language"
                  className="upload-file__input upload-file__select"
                  value={quizLanguage}
                  onChange={(event) => setQuizLanguage(event.target.value as QuizLanguageCode)}
                  disabled={loading}
                >
                  {QUIZ_LANGUAGE_CODES.map((code) => (
                    <option key={code} value={code}>
                      {t(`upload.languages.${code}`)}
                    </option>
                  ))}
                </select>

                <div className="upload-file__submit">
                  {trimmedText ? (
                    <p
                      className={`upload-file__token-cost${
                        isActiveTextOverLimit ||
                        isQuestionCountBlocking ||
                        (tokenBalance !== null && costPreview && !hasEnoughTokens)
                          ? " upload-file__token-cost--insufficient"
                          : ""
                      }`}
                      role="status"
                    >
                      {isActiveTextOverLimit
                        ? t("upload.textCharLimitExceeded", {
                            max: maxTextChars.toLocaleString(),
                          })
                        : isQuestionCountBlocking && questionCountField.errorMessage
                          ? questionCountField.errorMessage
                          : costPreviewLoading || !costPreview
                            ? t("upload.tokensCostLoading")
                            : tokenBalance !== null
                              ? t("upload.estimatedTokensWithBalance", {
                                  cost: totalEstimatedTokens,
                                  balance: tokenBalance,
                                })
                              : t("upload.estimatedTokensAboveGenerate", {
                                  cost: totalEstimatedTokens,
                                })}
                    </p>
                  ) : null}
                  {tokenBalance !== null && costPreview && !hasEnoughTokens ? (
                    <p className="upload-file__token-hint" role="alert">
                      <button
                        type="button"
                        className="upload-file__token-hint-action"
                        onClick={() => setUpgradeModalOpen(true)}
                      >
                        {t("upload.buyMorePoints")}
                      </button>{" "}
                      {t("upload.insufficientTokensHintSuffix")}
                    </p>
                  ) : null}
                  <Button
                    type="submit"
                    style="primary"
                    disabled={
                      loading ||
                      !trimmedText ||
                      isActiveTextOverLimit ||
                      isQuestionCountBlocking ||
                      costPreviewLoading ||
                      (Boolean(trimmedText) && !costPreview) ||
                      !hasEnoughTokens
                    }
                  >
                    {busyAction === "generate" ? t("upload.sending") : t("upload.generate")}
                  </Button>
                  {trimmedText && costPreview && !costPreviewLoading ? (
                    <p className="upload-file__token-cost" role="status">
                      {t("upload.estimatedSummarizationTokens", {
                        cost: summarizationTokens,
                      })}
                    </p>
                  ) : null}
                  {tokenBalance !== null && costPreview && !hasEnoughTokensForUpload ? (
                    <p className="upload-file__token-hint" role="alert">
                      {t("upload.insufficientTokensSummarizationHint")}
                    </p>
                  ) : null}
                  <div className="upload-file__upload-document-block">
                    <Button
                      type="button"
                      style="secondary"
                      disabled={
                        loading ||
                        (!isBasicPlan &&
                          (isActiveTextOverLimit ||
                            isQuestionCountBlocking ||
                            costPreviewLoading ||
                            !costPreview ||
                            !hasEnoughTokensForUpload))
                      }
                      onClick={handleUploadDocumentClick}
                    >
                      {busyAction === "upload"
                        ? t("upload.uploadDocumentSending")
                        : t("upload.uploadDocument")}
                      <span className="upload-file__premium-badge">{t("upload.premiumBadge")}</span>
                    </Button>
                    <p className="upload-file__char-hint upload-file__upload-document-hint">
                      {t("upload.uploadDocumentHint")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <details className="upload-file__advanced">
            <summary className="upload-file__advanced-summary">
              {t("upload.advancedSection")}
            </summary>
            <div className="upload-file__advanced-body">
              <label className="upload-file__label" htmlFor="question-count">
                {t("upload.questionsPerChunkFieldLabel", {
                  chunkSize: chunkSizeChars.toLocaleString(),
                })}
              </label>
              <input
                id="question-count"
                className="upload-file__input"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={questionCountField.questionCountInput}
                onChange={(event) => questionCountField.handleChange(event.target.value)}
                onBlur={questionCountField.handleBlur}
                aria-invalid={Boolean(questionCountField.errorMessage)}
                disabled={loading || (isPlanKnown && !isPremiumPlan)}
              />
              {questionCountField.errorMessage ? (
                <p className="upload-file__error" role="alert">
                  {questionCountField.errorMessage}
                </p>
              ) : null}
              <p className="upload-file__char-hint">
                {t("upload.advancedCharCounter", {
                  chunkCount: chunkCount || 1,
                  chunkSize: chunkSizeChars.toLocaleString(),
                  chars: charCount,
                  totalQuestions: estimatedTotalQuestions,
                })}
              </p>
            </div>
          </details>
        </form>
      </Card>

      {error && (
        <p className="upload-file__error upload-file__error--alert" role="alert">
          {error}
        </p>
      )}
      {requiredTokens !== null && (
        <div className="upload-file__error upload-file__error--paywall" role="status">
          <p>{t("upload.insufficientTokensDescription")}</p>
          <Button type="button" onClick={() => setUpgradeModalOpen(true)}>
            {t("upload.upgrade")}
          </Button>
        </div>
      )}

      <UpgradeModal open={upgradeModalOpen} onClose={() => setUpgradeModalOpen(false)} />
      <UpgradeSubscriptionModal
        open={upgradeSubscriptionModalOpen}
        onClose={() => setUpgradeSubscriptionModalOpen(false)}
      />

      <OcrRemoveWarningModal
        open={pdfOcr.pendingRemoveFileName !== null}
        fileName={pdfOcr.pendingRemoveFileName ?? ""}
        canUploadDocument={canUploadDocumentFromOcrWarning}
        isPremiumRequired={isPlanKnown && !isPremiumPlan}
        onUploadDocument={() => {
          pdfOcr.setPendingRemoveFileName(null);
          void handleUploadDocument();
        }}
        onConfirmRemove={() => {
          if (pdfOcr.pendingRemoveFileName) {
            pdfOcr.performRemoveFile(pdfOcr.pendingRemoveFileName, clearUploadedText);
          }
        }}
        onCancel={() => pdfOcr.setPendingRemoveFileName(null)}
      />

      <OcrConfirmModal
        open={pdfOcr.pendingOcrFile !== null}
        fileName={pdfOcr.pendingOcrFile?.name ?? ""}
        tokenCost={ocrImageTokenCost}
        tokenBalance={tokenBalance}
        onConfirm={() => void pdfOcr.handleOcrConfirm()}
        onCancel={pdfOcr.handleOcrCancel}
      />

      <PdfPageSelectModal
        open={pdfOcr.pendingPageSelection !== null}
        fileName={pdfOcr.pendingPageSelection?.job.originalFilename ?? ""}
        pages={pdfOcr.pendingPageSelection?.pages ?? []}
        maxSelectablePages={pdfOcr.pendingPageSelection?.maxSelectablePages ?? 10}
        onConfirm={(pageIndices) => void pdfOcr.handlePageSelectionConfirm(pageIndices)}
        onCancel={pdfOcr.handlePageSelectionCancel}
      />

      <PdfOcrConfirmModal
        open={pdfOcr.pendingPdfOcrJob !== null}
        fileName={pdfOcr.pendingPdfOcrJob?.originalFilename ?? ""}
        pagesNeedingOcr={pdfOcr.pendingPdfOcrJob?.pagesNeedingOcr ?? 0}
        totalPages={pdfOcr.pendingPdfOcrJob?.totalPages ?? 0}
        tokenCost={pdfOcr.pendingPdfOcrJob?.totalTokenCost ?? 0}
        tokenBalance={tokenBalance}
        onConfirm={() => void pdfOcr.handlePdfOcrConfirm()}
        onCancel={pdfOcr.handlePdfOcrConfirmCancel}
      />

      <PdfOcrProgressModal
        open={pdfOcr.activePdfOcrJob !== null}
        job={pdfOcr.activePdfOcrJob}
        onCancel={() => void pdfOcr.handlePdfOcrProgressCancel()}
      />
    </Page>
  );
};

export default GenerateQuizPage;
