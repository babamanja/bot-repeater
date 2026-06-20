import { useCallback, useEffect, useState } from "react";
import type { TFunction } from "i18next";

import { refreshMyTokenBalance } from "../../../api/tokens";
import {
  analyzePdfUpload,
  cancelPdfOcrJob,
  extractUploadText,
  getPdfOcrJob,
  selectPdfOcrPages,
  startPdfOcrJob,
  type PdfOcrJob,
  type PdfPagePreview,
} from "../../../api/file";
import type { DocumentSourceType } from "../../../api/document";
import type { GenerationUploadProfile } from "../../../config/generationUploadProfile";
import {
  isImageUploadFile,
  isPdfUploadFile,
  mapFileExtractError,
} from "../../../utils/fileExtract";
import { createRequestId } from "../../../analytics";

const PDF_OCR_POLL_INTERVAL_MS = 2000;

type BusyAction = null | "parse" | "generate" | "upload";

type UsePdfOcrFlowOptions = {
  t: TFunction;
  uploadProfile: GenerationUploadProfile;
  setBusyAction: (action: BusyAction) => void;
  setError: (error: string | null) => void;
  setRequiredTokens: (tokens: number | null) => void;
  setTokenBalance: (balance: number | null) => void;
  onUploadTokenError: (message: string, requestId: string) => void;
  onTextExtracted: (text: string, options: { fromOcr: boolean; sourceType?: DocumentSourceType }) => void;
};

export function usePdfOcrFlow({
  t,
  uploadProfile,
  setBusyAction,
  setError,
  setRequiredTokens,
  setTokenBalance,
  onUploadTokenError,
  onTextExtracted,
}: UsePdfOcrFlowOptions) {
  const [files, setFiles] = useState<File[]>([]);
  const [extractNotice, setExtractNotice] = useState<string | null>(null);
  const [ocrExtractionActive, setOcrExtractionActive] = useState(false);
  const [pendingOcrFile, setPendingOcrFile] = useState<File | null>(null);
  const [pendingPdfOcrJob, setPendingPdfOcrJob] = useState<PdfOcrJob | null>(null);
  const [pendingPageSelection, setPendingPageSelection] = useState<{
    job: PdfOcrJob;
    pages: PdfPagePreview[];
    maxSelectablePages: number;
  } | null>(null);
  const [activePdfOcrJob, setActivePdfOcrJob] = useState<PdfOcrJob | null>(null);
  const [pendingRemoveFileName, setPendingRemoveFileName] = useState<string | null>(null);

  const applyExtractedText = useCallback(
    (extracted: string, fromOcr = false, sourceType?: DocumentSourceType) => {
      onTextExtracted(extracted, { fromOcr, sourceType });
      setOcrExtractionActive(fromOcr);
    },
    [onTextExtracted],
  );

  const applyPdfOcrJobResult = useCallback(
    (job: PdfOcrJob) => {
      if (job.assembledText?.trim()) {
        applyExtractedText(job.assembledText, true, "pdf");
        setExtractNotice(t("upload.ocrSuccessNotice"));
      }
      setActivePdfOcrJob(null);
      void refreshMyTokenBalance().then((balance) => {
        if (balance !== null) {
          setTokenBalance(balance);
        }
      });
    },
    [applyExtractedText, setTokenBalance, t],
  );

  const handlePdfOcrJobEnded = useCallback(
    (job: PdfOcrJob) => {
      if (job.assembledText?.trim()) {
        applyExtractedText(job.assembledText, true, "pdf");
        if (job.status === "cancelled") {
          setExtractNotice(t("upload.pdfOcrCancelledPartialNotice"));
        }
      }
      if (job.status === "failed") {
        setError(mapFileExtractError(job.errorMessage ?? "ocr_empty_text", t));
        setFiles((prev) => prev.filter((item) => item.name !== job.originalFilename));
      }
      setActivePdfOcrJob(null);
      void refreshMyTokenBalance().then((balance) => {
        if (balance !== null) {
          setTokenBalance(balance);
        }
      });
    },
    [applyExtractedText, setError, setTokenBalance, t],
  );

  useEffect(() => {
    if (!activePdfOcrJob || activePdfOcrJob.status !== "processing") {
      return;
    }
    const timer = window.setInterval(() => {
      void getPdfOcrJob(activePdfOcrJob.id)
        .then((job) => {
          setActivePdfOcrJob(job);
          if (job.status === "completed") {
            applyPdfOcrJobResult(job);
          } else if (job.status === "failed" || job.status === "cancelled") {
            handlePdfOcrJobEnded(job);
          }
        })
        .catch(() => undefined);
    }, PDF_OCR_POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [
    activePdfOcrJob?.id,
    activePdfOcrJob?.status,
    applyPdfOcrJobResult,
    handlePdfOcrJobEnded,
  ]);

  async function runExtractUpload(file: File) {
    setBusyAction("parse");
    const requestId = createRequestId();
    try {
      const extracted = await extractUploadText(file);
      const fromOcr = extracted.extractionMethod === "ocr";
      applyExtractedText(extracted.text, fromOcr, "text");
      if (fromOcr) {
        setExtractNotice(t("upload.ocrSuccessNotice"));
      }
      if (extracted.tokensCharged && extracted.tokensCharged > 0) {
        const balance = await refreshMyTokenBalance();
        if (balance !== null) {
          setTokenBalance(balance);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t("upload.requestFailed");
      if (message.startsWith("INSUFFICIENT_TOKEN_BALANCE:")) {
        onUploadTokenError(message, requestId);
      } else {
        setError(mapFileExtractError(message, t));
      }
      setFiles((prev) => prev.filter((item) => item.name !== file.name));
    } finally {
      setBusyAction(null);
    }
  }

  async function runAnalyzePdf(file: File) {
    setBusyAction("parse");
    setFiles((prev) => [...prev, file]);
    const requestId = createRequestId();
    try {
      const result = await analyzePdfUpload(file);
      if (result.status === "completed") {
        applyExtractedText(result.assembledText, false, "pdf");
        return;
      }
      if (result.status === "page_selection_required") {
        setPendingPageSelection({
          job: result.job,
          pages: result.pages,
          maxSelectablePages: result.maxSelectablePages,
        });
        return;
      }
      setPendingPdfOcrJob(result.job);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("upload.requestFailed");
      if (message.startsWith("INSUFFICIENT_TOKEN_BALANCE:")) {
        onUploadTokenError(message, requestId);
      } else {
        setError(mapFileExtractError(message, t));
      }
      setFiles((prev) => prev.filter((item) => item.name !== file.name));
    } finally {
      setBusyAction(null);
    }
  }

  const handleFileChange = async (file: File) => {
    setError(null);
    setExtractNotice(null);
    setRequiredTokens(null);
    setOcrExtractionActive(false);

    if (isImageUploadFile(file)) {
      setPendingOcrFile(file);
      return;
    }

    if (isPdfUploadFile(file)) {
      await runAnalyzePdf(file);
      return;
    }

    setBusyAction("parse");
    setFiles((prev) => [...prev, file]);

    const lowerName = file.name.toLowerCase();
    const nextSourceType: DocumentSourceType = lowerName.endsWith(".docx")
      ? "docx"
      : "text";

    const reader = new FileReader();
    reader.onload = (e) => {
      applyExtractedText((e.target?.result as string) ?? "", false, nextSourceType);
      setBusyAction(null);
    };
    reader.onerror = () => {
      setError(t("upload.requestFailed"));
      setFiles((prev) => prev.filter((item) => item.name !== file.name));
      setBusyAction(null);
    };
    reader.readAsText(file);
  };

  async function handleOcrConfirm() {
    if (!pendingOcrFile) {
      return;
    }
    const file = pendingOcrFile;
    setPendingOcrFile(null);
    setFiles((prev) => [...prev, file]);
    await runExtractUpload(file);
  }

  function handleOcrCancel() {
    setPendingOcrFile(null);
  }

  async function handlePdfOcrConfirm() {
    if (!pendingPdfOcrJob) {
      return;
    }
    const pendingJob = pendingPdfOcrJob;
    setPendingPdfOcrJob(null);
    setBusyAction("parse");
    const requestId = createRequestId();
    try {
      const job = await startPdfOcrJob(pendingJob.id);
      setActivePdfOcrJob(job);
      const balance = await refreshMyTokenBalance();
      if (balance !== null) {
        setTokenBalance(balance);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t("upload.requestFailed");
      if (message.startsWith("INSUFFICIENT_TOKEN_BALANCE:")) {
        onUploadTokenError(message, requestId);
      } else {
        setError(mapFileExtractError(message, t));
      }
      setFiles((prev) => prev.filter((item) => item.name !== pendingJob.originalFilename));
    } finally {
      setBusyAction(null);
    }
  }

  function handlePdfOcrConfirmCancel() {
    if (!pendingPdfOcrJob) {
      return;
    }
    const jobId = pendingPdfOcrJob.id;
    const filename = pendingPdfOcrJob.originalFilename;
    setPendingPdfOcrJob(null);
    setFiles((prev) => prev.filter((item) => item.name !== filename));
    void cancelPdfOcrJob(jobId).catch(() => undefined);
  }

  async function handlePageSelectionConfirm(pageIndices: number[]) {
    if (!pendingPageSelection) {
      return;
    }
    const { job } = pendingPageSelection;
    setPendingPageSelection(null);
    setBusyAction("parse");
    const requestId = createRequestId();
    try {
      const result = await selectPdfOcrPages(job.id, pageIndices);
      if (result.status === "completed") {
        applyExtractedText(result.assembledText, false, "pdf");
        if (result.textTruncated) {
          setExtractNotice(
            t("upload.textTruncatedNotice", {
              max: uploadProfile.maxTextChars,
            }),
          );
        }
        return;
      }
      setPendingPdfOcrJob(result.job);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("upload.requestFailed");
      if (message.startsWith("INSUFFICIENT_TOKEN_BALANCE:")) {
        onUploadTokenError(message, requestId);
      } else {
        setError(mapFileExtractError(message, t));
      }
      setFiles((prev) => prev.filter((item) => item.name !== job.originalFilename));
    } finally {
      setBusyAction(null);
    }
  }

  function handlePageSelectionCancel() {
    if (!pendingPageSelection) {
      return;
    }
    const jobId = pendingPageSelection.job.id;
    const filename = pendingPageSelection.job.originalFilename;
    setPendingPageSelection(null);
    setFiles((prev) => prev.filter((item) => item.name !== filename));
    void cancelPdfOcrJob(jobId).catch(() => undefined);
  }

  async function handlePdfOcrProgressCancel() {
    if (!activePdfOcrJob) {
      return;
    }
    try {
      const job = await cancelPdfOcrJob(activePdfOcrJob.id);
      handlePdfOcrJobEnded(job);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("upload.requestFailed");
      setError(mapFileExtractError(message, t));
    }
  }

  function performRemoveFile(fileName: string, onUploadedTextCleared: () => void) {
    const updatedFiles = files.filter((f) => f.name !== fileName);
    setFiles(updatedFiles);
    if (updatedFiles.length === 0) {
      onUploadedTextCleared();
      setExtractNotice(null);
      setOcrExtractionActive(false);
    }
    setPendingRemoveFileName(null);
  }

  function requestRemoveFile(fileName: string, hasUploadedText: boolean, onUploadedTextCleared: () => void) {
    if (ocrExtractionActive && hasUploadedText) {
      setPendingRemoveFileName(fileName);
      return;
    }
    performRemoveFile(fileName, onUploadedTextCleared);
  }

  function clearExtractNotice() {
    setExtractNotice(null);
  }

  return {
    files,
    extractNotice,
    ocrExtractionActive,
    pendingOcrFile,
    pendingPdfOcrJob,
    pendingPageSelection,
    activePdfOcrJob,
    pendingRemoveFileName,
    setPendingRemoveFileName,
    handleFileChange,
    handleOcrConfirm,
    handleOcrCancel,
    handlePdfOcrConfirm,
    handlePdfOcrConfirmCancel,
    handlePageSelectionConfirm,
    handlePageSelectionCancel,
    handlePdfOcrProgressCancel,
    performRemoveFile,
    requestRemoveFile,
    clearExtractNotice,
  };
}
