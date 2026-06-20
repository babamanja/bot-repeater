import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  deleteDocument,
  getDocumentById,
  type DocumentChunkDetail,
  type DocumentDetailResponse,
} from "../../api/document";
import {
  DocumentChunkStatusBadge,
  DocumentStatusBadge,
} from "../../components/Document/DocumentStatusBadge";
import Button from "../../components/UI/Button/Button";
import ButtonLink from "../../components/UI/Button/ButtonLink";
import GenerateQuizFromDocumentModal from "./GenerateQuizFromDocumentModal";
import { QUIZ_CREATE_PATH } from "../../paths";
import { getChunkDisplayTitle } from "../../utils/chunkDisplayTitle";

import "../style.scss";

const POLL_INTERVAL_MS = 3000;
const PROCESSING_STATUSES = new Set(["uploaded", "text_extracted", "chunked"]);

function canGenerateQuiz(
  documentStatus: DocumentDetailResponse["document"]["status"],
  chunkStatus: DocumentChunkDetail["status"],
): boolean {
  return documentStatus === "summarized" && chunkStatus !== "failed";
}

export default function DocumentDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { documentId } = useParams<{ documentId: string }>();
  const [detail, setDetail] = useState<DocumentDetailResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [generateModalChunk, setGenerateModalChunk] = useState<DocumentChunkDetail | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const loadDetail = useCallback(() => {
    if (!documentId) {
      return Promise.resolve();
    }
    return getDocumentById(documentId)
      .then((data) => {
        setDetail(data);
        setLoadError(null);
      })
      .catch((error) => {
        setDetail(null);
        setLoadError(
          error instanceof Error ? error.message : t("documents.detail.loadFailed"),
        );
      });
  }, [documentId, t]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (!detail || !PROCESSING_STATUSES.has(detail.document.status)) {
      return;
    }
    const timer = window.setInterval(() => {
      void loadDetail();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [detail, loadDetail]);

  async function handleDeleteDocument() {
    if (!documentId) {
      return;
    }
    if (!window.confirm(t("documents.detail.deleteConfirm"))) {
      return;
    }
    setActionError(null);
    setIsDeleting(true);
    try {
      await deleteDocument(documentId);
      navigate("/documents", { replace: true });
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : t("documents.detail.deleteFailed"),
      );
    } finally {
      setIsDeleting(false);
    }
  }

  function openGenerateQuizModal(chunk: DocumentChunkDetail) {
    setActionError(null);
    setGenerateModalChunk(chunk);
  }

  if (!documentId) {
    return (
      <section className="document-detail">
        <p className="upload-file__error" role="alert">
          {t("documents.detail.missingId")}
        </p>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="document-detail">
        <p className="upload-file__error" role="alert">
          {loadError}
        </p>
        <ButtonLink to="/documents" style="secondary">
          {t("documents.detail.backToList")}
        </ButtonLink>
      </section>
    );
  }

  if (!detail) {
    return (
      <section className="document-detail">
        <p role="status">{t("documents.detail.loading")}</p>
      </section>
    );
  }

  const { document, chunks } = detail;

  return (
    <section className="document-detail">
      <nav className="document-detail__breadcrumb">
        <Link to="/documents">{t("documents.detail.backToList")}</Link>
      </nav>

      <header className="document-detail__header">
        <div>
          <h1>{document.title.trim() || "—"}</h1>
          <p className="document-detail__meta">
            <DocumentStatusBadge status={document.status} />
            <span>{t(`documents.sourceType.${document.sourceType}`)}</span>
          </p>
        </div>
        <div className="document-detail__header-actions">
          <ButtonLink to={QUIZ_CREATE_PATH} style="primary">
            {t("documents.list.uploadNew")}
          </ButtonLink>
          <Button
            type="button"
            style="secondary"
            disabled={isDeleting || generateModalChunk !== null}
            onClick={() => void handleDeleteDocument()}
          >
            {isDeleting ? t("upload.sending") : t("documents.detail.delete")}
          </Button>
        </div>
      </header>

      {document.errorMessage ? (
        <p className="upload-file__error" role="alert">
          {document.errorMessage}
        </p>
      ) : null}

      {actionError ? (
        <p className="upload-file__error" role="alert">
          {actionError}
        </p>
      ) : null}

      <h2 className="document-detail__summaries-title">{t("documents.detail.summariesTitle")}</h2>

      {chunks.length === 0 ? (
        <p className="document-detail__empty">{t("documents.detail.noSummaries")}</p>
      ) : (
        <ul className="document-detail__summaries">
          {chunks.map((chunk) => {
            const chunkLabel = getChunkDisplayTitle(
              chunk,
              t("documents.detail.summaryItemFallback", {
                index: chunk.chunkIndex + 1,
              }),
            );
            return (
            <li key={chunk.id}>
              <details
                className="document-detail__summary-card"
                open={false}
              >
                <summary className="document-detail__summary-toggle">
                  <span className="document-detail__summary-toggle-title">
                    {chunkLabel}
                  </span>
                  <DocumentChunkStatusBadge status={chunk.status} />
                  {canGenerateQuiz(document.status, chunk.status) ? (
                    <span className="document-detail__summary-toggle-action">
                      <Button
                        type="button"
                        style="primary"
                        disabled={generateModalChunk !== null}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          openGenerateQuizModal(chunk);
                        }}
                      >
                        {t("documents.detail.generateQuiz")}
                      </Button>
                    </span>
                  ) : null}
                </summary>
                <div className="document-detail__summary-body">
                  {chunk.errorMessage ? (
                    <p className="upload-file__error" role="alert">
                      {chunk.errorMessage}
                    </p>
                  ) : null}
                  {chunk.summary ? (
                    <p className="document-detail__summary-text">{chunk.summary}</p>
                  ) : (
                    <p className="document-detail__empty">
                      {t("documents.detail.summaryUnavailable")}
                    </p>
                  )}
                </div>
              </details>
            </li>
            );
          })}
        </ul>
      )}

      <GenerateQuizFromDocumentModal
        open={generateModalChunk !== null}
        documentId={documentId}
        chunk={generateModalChunk}
        onClose={() => setGenerateModalChunk(null)}
        onGenerated={(quizId) => {
          navigate("/quiz-list", { state: { highlightQuizId: quizId } });
        }}
      />
    </section>
  );
}
