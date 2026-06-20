import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { faFileLines, faFilePdf } from "@fortawesome/free-solid-svg-icons";

import { deleteDocument, getDocumentList, type DocumentSourceType, type DocumentSummary } from "../../api/document";
import { DocumentStatusBadge } from "../../components/Document/DocumentStatusBadge";
import ButtonLink from "../../components/UI/Button/ButtonLink";
import DeleteIconButton from "../../components/UI/Button/DeleteIconButton";
import IconComponent from "../../components/UI/Icon";
import ResponsiveDataList from "../../components/UI/ResponsiveDataList";
import type { DataListColumn } from "../../components/UI/dataListTypes";
import { QUIZ_CREATE_PATH } from "../../paths";
import { formatRelativeTime } from "../../utils/convertTime";
import { truncateTextWithTitle } from "../../utils/truncateText";

import "../style.scss";

const POLL_INTERVAL_MS = 3000;
const PROCESSING_STATUSES = new Set(["uploaded", "text_extracted", "chunked"]);

function sourceIcon(sourceType: DocumentSourceType) {
  if (sourceType === "pdf") {
    return faFilePdf;
  }
  return faFileLines;
}

export default function DocumentListPage() {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);

  const loadDocuments = useCallback(() => {
    return getDocumentList()
      .then((data) => {
        setDocuments(data);
        setLoadError(null);
      })
      .catch((error) => {
        setDocuments([]);
        setLoadError(
          error instanceof Error ? error.message : t("documents.list.loadFailed"),
        );
      });
  }, [t]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    const needsPoll = documents.some((doc) => PROCESSING_STATUSES.has(doc.status));
    if (!needsPoll) {
      return;
    }
    const timer = window.setInterval(() => {
      void loadDocuments();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [documents, loadDocuments]);

  async function handleDeleteDocument(doc: DocumentSummary) {
    if (!window.confirm(t("documents.list.deleteConfirm"))) {
      return;
    }
    setDeleteError(null);
    setDeletingDocumentId(doc.id);
    try {
      await deleteDocument(doc.id);
      setDocuments((prev) => prev.filter((row) => row.id !== doc.id));
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : t("documents.list.deleteFailed"),
      );
    } finally {
      setDeletingDocumentId(null);
    }
  }

  const columns = useMemo<DataListColumn<DocumentSummary>[]>(
    () => [
      {
        id: "titleSummary",
        label: t("documents.list.columns.title"),
        mobileRole: "summary-primary",
        desktopHidden: true,
        render: (doc) => truncateTextWithTitle(doc.title.trim() || "—").display,
      },
      {
        id: "title",
        label: t("documents.list.columns.title"),
        hideOnMobile: true,
        cellClassName: "data-table__cell--truncate",
        render: (doc) => {
          const { display, title } = truncateTextWithTitle(doc.title.trim() || "—");
          return (
            <Link
              className="document-list__title-link"
              to={`/documents/${doc.id}`}
              title={title}
            >
              {display}
            </Link>
          );
        },
      },
      {
        id: "status",
        label: t("documents.list.columns.status"),
        mobileRole: "summary-secondary",
        render: (doc) => <DocumentStatusBadge status={doc.status} />,
      },
      {
        id: "sourceType",
        label: t("documents.list.columns.sourceType"),
        mobileRole: "detail",
        render: (doc) => (
          <span className="document-list-card__source">
            <IconComponent
              faIcon={sourceIcon(doc.sourceType)}
              iconClassName="document-list-card__source-icon"
            />
            <span>{t(`documents.sourceType.${doc.sourceType}`)}</span>
          </span>
        ),
      },
      {
        id: "summaryCount",
        label: t("documents.list.columns.chunkCount"),
        mobileRole: "detail",
        render: (doc) => doc.chunkCount ?? 0,
      },
      {
        id: "createdAt",
        label: t("documents.list.columns.createdAt"),
        mobileRole: "detail",
        mobileWide: true,
        render: (doc) => formatRelativeTime(doc.createdAt),
      },
      {
        id: "view",
        label: t("documents.list.open"),
        hideOnMobile: true,
        header: t("documents.list.columns.view"),
        render: (doc) => (
          <ButtonLink to={`/documents/${doc.id}`} style="borderless">
            {t("documents.list.open")}
          </ButtonLink>
        ),
      },
      {
        id: "delete",
        label: t("documents.list.delete"),
        hideOnMobile: true,
        header: "",
        render: (doc) => (
          <DeleteIconButton
            type="button"
            aria-label={t("documents.list.delete")}
            title={t("documents.list.delete")}
            disabled={deletingDocumentId === doc.id}
            aria-busy={deletingDocumentId === doc.id}
            onClick={() => void handleDeleteDocument(doc)}
          />
        ),
      },
      {
        id: "mobileActions",
        label: "",
        mobileRole: "footer",
        desktopHidden: true,
        render: (doc) => (
          <>
            <ButtonLink to={`/documents/${doc.id}`} style="primary" className="document-list-card__open">
              {t("documents.list.open")}
            </ButtonLink>
            <DeleteIconButton
              type="button"
              aria-label={t("documents.list.delete")}
              title={t("documents.list.delete")}
              disabled={deletingDocumentId === doc.id}
              aria-busy={deletingDocumentId === doc.id}
              onClick={() => void handleDeleteDocument(doc)}
            />
          </>
        ),
      },
    ],
    [deletingDocumentId, t],
  );

  return (
    <section className="document-list">
      <header className="document-list__header">
        <h1>{t("documents.list.title")}</h1>
        <ButtonLink to={QUIZ_CREATE_PATH} style="primary">
          {t("documents.list.uploadNew")}
        </ButtonLink>
      </header>

      {loadError ? (
        <p className="upload-file__error" role="alert">
          {loadError}
        </p>
      ) : null}
      {deleteError ? (
        <p className="upload-file__error" role="alert">
          {deleteError}
        </p>
      ) : null}

      {!loadError ? (
        <ResponsiveDataList
          className="document-list__data"
          columns={columns}
          data={documents}
          getRowKey={(doc) => doc.id}
        />
      ) : null}
    </section>
  );
}
