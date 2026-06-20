import {
  faArrowUpFromBracket,
  faBolt,
  faBullseye,
  faCircleCheck,
  faFileLines,
  faFilePdf,
  faImage,
} from "@fortawesome/free-solid-svg-icons";
import type { ChangeEvent, DragEvent } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import IconComponent from "./Icon";
import "./UploadFile.scss";

const ACCEPT =
  ".txt,.pdf,.jpg,.jpeg,.png,.webp,text/plain,application/pdf,image/jpeg,image/png,image/webp";

function isAllowedFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  if (
    lower.endsWith(".txt") ||
    lower.endsWith(".pdf") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".webp")
  ) {
    return true;
  }
  return (
    file.type === "text/plain" ||
    file.type === "application/pdf" ||
    file.type === "image/jpeg" ||
    file.type === "image/png" ||
    file.type === "image/webp"
  );
}

type UploadFileProps = {
  onFileChange: (file: File) => Promise<void> | void;
  disabled?: boolean;
  maxBytes: number;
  variant?: "default" | "landing";
};

export default function UploadFile({
  onFileChange,
  disabled = false,
  maxBytes,
  variant = "default",
}: UploadFileProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const maxMb = useMemo(() => maxBytes / (1024 * 1024), [maxBytes]);
  const isLanding = variant === "landing";
  const showFeatures = isLanding;

  const clearErrorSoon = useCallback(() => {
    window.setTimeout(() => setLocalError(null), 5000);
  }, []);

  const pickFiles = useCallback(() => {
    if (disabled) {
      return;
    }
    inputRef.current?.click();
  }, [disabled]);

  const processFile = useCallback(
    async (file: File) => {
      setLocalError(null);
      if (file.size > maxBytes) {
        setLocalError(t("upload.dropzoneFileTooLarge", { maxMb }));
        clearErrorSoon();
        return;
      }
      if (!isAllowedFile(file)) {
        setLocalError(t("upload.dropzoneInvalidType"));
        clearErrorSoon();
        return;
      }
      await onFileChange(file);
    },
    [onFileChange, t, clearErrorSoon, maxBytes, maxMb],
  );

  async function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) {
      await processFile(file);
    }
  }

  const handleDragEnter = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) {
        return;
      }
      dragDepth.current += 1;
      setIsDragging(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragDepth.current = 0;
      setIsDragging(false);
      if (disabled) {
        return;
      }
      const file = e.dataTransfer.files?.[0];
      if (file) {
        await processFile(file);
      }
    },
    [disabled, processFile],
  );

  const dropzoneLabel = isDragging
    ? isLanding
      ? t("landing.hero.demo.upload.dropzoneDragActive")
      : t("upload.dropzoneDragActive")
    : isLanding
      ? t("landing.hero.demo.upload.dropzone")
      : t("upload.dropzoneTitle");

  const cardTitle = isLanding
    ? t("landing.hero.demo.upload.title")
    : t("upload.tabUpload");

  const cardSubtitle = isLanding ? t("landing.hero.demo.upload.subtitle") : null;

  const cardHint = isLanding
    ? t("landing.hero.demo.upload.hint", { maxMb })
    : t("upload.dropzoneHint", { maxMb });

  return (
    <div
      className={[
        "upload-dropzone-root",
        isLanding ? "upload-dropzone-root--landing" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <input
        ref={inputRef}
        type="file"
        className="upload-dropzone-root__input"
        accept={ACCEPT}
        disabled={disabled}
        onChange={handleInputChange}
        aria-label={dropzoneLabel}
      />
      <div
        className={[
          "upload-landing-card",
          showFeatures ? "" : "upload-landing-card--compact",
          isDragging ? "upload-landing-card--dragging" : "",
          disabled ? "upload-landing-card--disabled" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div
          className={[
            "upload-landing-card__inner",
            showFeatures ? "" : "upload-landing-card__inner--compact",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="upload-landing-card__icons" aria-hidden>
            <div className="upload-landing-card__icon upload-landing-card__icon--pdf">
              <IconComponent faIcon={faFilePdf} iconClassName="upload-landing-card__fa" />
              <span className="upload-landing-card__icon-label">PDF</span>
            </div>
            <div className="upload-landing-card__icon upload-landing-card__icon--txt">
              <IconComponent faIcon={faFileLines} iconClassName="upload-landing-card__fa" />
              <span className="upload-landing-card__icon-label">TXT</span>
            </div>
            <div className="upload-landing-card__icon upload-landing-card__icon--image">
              <IconComponent faIcon={faImage} iconClassName="upload-landing-card__fa" />
            </div>
          </div>

          <div className="upload-landing-card__main">
            <h3 className="upload-landing-card__title">{cardTitle}</h3>
            {cardSubtitle ? (
              <p className="upload-landing-card__subtitle">{cardSubtitle}</p>
            ) : null}
            <button
              type="button"
              className="upload-landing-card__zone"
              disabled={disabled}
              onClick={pickFiles}
            >
              <IconComponent
                faIcon={faArrowUpFromBracket}
                iconClassName="upload-landing-card__zone-icon"
              />
              <span>{dropzoneLabel}</span>
            </button>
            <p className="upload-landing-card__hint">{cardHint}</p>
          </div>

          {showFeatures ? (
            <ul className="upload-landing-card__features">
              <li>
                <span className="upload-landing-card__feature-icon" aria-hidden>
                  <IconComponent faIcon={faCircleCheck} iconClassName="upload-landing-card__fa" />
                </span>
                <span>{t("landing.hero.demo.upload.features.instant")}</span>
              </li>
              <li>
                <span className="upload-landing-card__feature-icon" aria-hidden>
                  <IconComponent faIcon={faBolt} iconClassName="upload-landing-card__fa" />
                </span>
                <span>{t("landing.hero.demo.upload.features.points")}</span>
              </li>
              <li>
                <span className="upload-landing-card__feature-icon" aria-hidden>
                  <IconComponent faIcon={faBullseye} iconClassName="upload-landing-card__fa" />
                </span>
                <span>{t("landing.hero.demo.upload.features.results")}</span>
              </li>
            </ul>
          ) : null}
        </div>
      </div>
      {localError ? (
        <p className="upload-dropzone-root__error" role="alert">
          {localError}
        </p>
      ) : null}
    </div>
  );
}
