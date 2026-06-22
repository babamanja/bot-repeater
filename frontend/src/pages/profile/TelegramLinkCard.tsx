import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  createTelegramLinkCode,
  getTelegramLinkStatus,
  type TelegramLinkCode,
  type TelegramLinkStatus,
  unlinkTelegram,
} from "../../api/telegram";
import Button from "../../components/UI/Button/Button";
import Card from "../../components/UI/Card";

function formatExpiry(value: string, locale: string | undefined): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function mapTelegramError(code: string, t: (key: string) => string): string {
  switch (code) {
    case "telegram_not_linked":
      return t("profilePage.telegram.notLinkedError");
    case "cannot_unlink_only_login_method":
      return t("profilePage.telegram.cannotUnlinkOnlyLogin");
    default:
      return t("profilePage.telegram.actionFailed");
  }
}

export default function TelegramLinkCard() {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState<TelegramLinkStatus | null>(null);
  const [linkCode, setLinkCode] = useState<TelegramLinkCode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [copyHint, setCopyHint] = useState<string | null>(null);

  async function loadStatus() {
    setIsLoading(true);
    try {
      const nextStatus = await getTelegramLinkStatus();
      setStatus(nextStatus);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : t("profilePage.telegram.loadFailed"),
      );
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadStatus();
  }, [t]);

  async function handleGenerateLink() {
    setIsLinking(true);
    setMessage(null);
    setIsSuccess(false);
    setCopyHint(null);
    try {
      const result = await createTelegramLinkCode();
      setLinkCode(result);
      setMessage(t("profilePage.telegram.linkCodeReady"));
      setIsSuccess(true);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : t("profilePage.telegram.actionFailed"),
      );
      setIsSuccess(false);
    } finally {
      setIsLinking(false);
    }
  }

  async function handleCopyLink() {
    if (!linkCode?.deepLink) {
      return;
    }
    try {
      await navigator.clipboard.writeText(linkCode.deepLink);
      setCopyHint(t("profilePage.telegram.linkCopied"));
    } catch {
      setCopyHint(t("profilePage.telegram.linkCopyFailed"));
    }
  }

  async function handleUnlink() {
    const confirmed = window.confirm(t("profilePage.telegram.unlinkConfirm"));
    if (!confirmed) {
      return;
    }
    setIsUnlinking(true);
    setMessage(null);
    setIsSuccess(false);
    try {
      await unlinkTelegram();
      setLinkCode(null);
      await loadStatus();
      setMessage(t("profilePage.telegram.unlinked"));
      setIsSuccess(true);
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      setMessage(mapTelegramError(code, t));
      setIsSuccess(false);
    } finally {
      setIsUnlinking(false);
    }
  }

  const linkedLabel = status?.telegramUsername
    ? `@${status.telegramUsername}`
    : status?.telegramId
      ? t("profilePage.telegram.linkedAsId", { id: status.telegramId })
      : null;

  return (
    <Card>
      <h2 className="profile-section__title">{t("profilePage.telegram.title")}</h2>
      <p className="upload-file__profile-hint">{t("profilePage.telegram.description")}</p>

      {isLoading ? <p>{t("profilePage.telegram.loading")}</p> : null}

      {!isLoading && status?.linked ? (
        <>
          <p className="profile-section__value">
            {t("profilePage.telegram.linkedLabel")}: <strong>{linkedLabel}</strong>
          </p>
          <Button
            type="button"
            style="secondary"
            onClick={() => void handleUnlink()}
            disabled={isUnlinking || isLinking}
          >
            {isUnlinking ? t("profilePage.telegram.unlinking") : t("profilePage.telegram.unlink")}
          </Button>
        </>
      ) : null}

      {!isLoading && !status?.linked ? (
        <>
          <p className="upload-file__profile-hint">{t("profilePage.telegram.linkInstructions")}</p>
          <Button
            type="button"
            onClick={() => void handleGenerateLink()}
            disabled={isLinking || isUnlinking}
          >
            {isLinking ? t("profilePage.telegram.generatingLink") : t("profilePage.telegram.generateLink")}
          </Button>
          {linkCode ? (
            <div className="profile-telegram-link">
              {linkCode.deepLink ? (
                <p className="profile-telegram-link__url">
                  <a href={linkCode.deepLink} target="_blank" rel="noreferrer">
                    {linkCode.deepLink}
                  </a>
                </p>
              ) : (
                <p className="upload-file__profile-hint">{t("profilePage.telegram.deepLinkMissing")}</p>
              )}
              <p className="upload-file__profile-hint">
                {t("profilePage.telegram.expiresAt", {
                  date: formatExpiry(linkCode.expiresAt, i18n.language),
                })}
              </p>
              {linkCode.deepLink ? (
                <Button type="button" style="secondary" onClick={() => void handleCopyLink()}>
                  {t("profilePage.telegram.copyLink")}
                </Button>
              ) : null}
              {copyHint ? <p className="upload-file__profile-hint">{copyHint}</p> : null}
            </div>
          ) : null}
        </>
      ) : null}

      {message ? (
        <p
          className={`upload-file__profile-hint${isSuccess ? " upload-file__profile-hint--success" : ""}`}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </Card>
  );
}
