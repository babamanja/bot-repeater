import { useTranslation } from "react-i18next";

import type { DocumentChunkStatus, DocumentStatus } from "../../api/document";

type DocumentStatusBadgeProps = {
  status: DocumentStatus;
};

export function DocumentStatusBadge({ status }: DocumentStatusBadgeProps) {
  const { t } = useTranslation();
  return (
    <span className={`document-status document-status--${status}`}>
      {t(`documents.status.${status}`)}
    </span>
  );
}

type DocumentChunkStatusBadgeProps = {
  status: DocumentChunkStatus;
};

export function DocumentChunkStatusBadge({ status }: DocumentChunkStatusBadgeProps) {
  const { t } = useTranslation();
  return (
    <span className={`document-status document-status--chunk-${status}`}>
      {t(`documents.chunkStatus.${status}`)}
    </span>
  );
}
