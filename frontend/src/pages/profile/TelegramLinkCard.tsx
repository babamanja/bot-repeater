import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  claimTelegramLinkCode,
  createTelegramLinkCode,
  getTelegramLinkStatus,
  type LanguageChoiceOption,
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
    case "invalid or expired code":
      return t("profilePage.telegram.invalidCode");
    case "code must be opened in telegram":
      return t("profilePage.telegram.codeMustOpenInTelegram");
    case "web account already linked to another telegram":
      return t("profilePage.telegram.alreadyLinkedElsewhere");
    case "language_choice_required":
      return t("profilePage.telegram.languageChoiceRequired");
    default:
      return t("profilePage.telegram.actionFailed");
  }
}

function formatLanguageOption(
  option: LanguageChoiceOption,
  t: (key: string, vars?: Record<string, string>) => string,
): string {
  return t("profilePage.telegram.languageOption", {
    primary: option.primaryLanguageName,
    learning: option.learningLanguageName,
    source:
      option.source === "web"
        ? t("profilePage.telegram.languageSourceWeb")
        : t("profilePage.telegram.languageSourceTelegram"),
  });
}

export default function TelegramLinkCard() {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState<TelegramLinkStatus | null>(null);
  const [linkCode, setLinkCode] = useState<TelegramLinkCode | null>(null);
  const [botCodeInput, setBotCodeInput] = useState("");
  const [pendingBotCode, setPendingBotCode] = useState<string | null>(null);
  const [languageOptions, setLanguageOptions] = useState<LanguageChoiceOption[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
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

  async function handleClaimCode(languageSource?: "web" | "telegram") {
    const rawCode = languageSource ? pendingBotCode : botCodeInput;
    const code = rawCode?.trim() ?? "";
    if (!code) {
      setMessage(t("profilePage.telegram.botCodeRequired"));
      setIsSuccess(false);
      return;
    }

    setIsClaiming(true);
    setMessage(null);
    setIsSuccess(false);
    try {
      const result = await claimTelegramLinkCode(code, languageSource);
      if (!result.ok) {
        if ("needsLanguageChoice" in result && result.needsLanguageChoice) {
          setPendingBotCode(code);
          setLanguageOptions(result.languageOptions);
          setMessage(t("profilePage.telegram.languageChoicePrompt"));
          setIsSuccess(false);
          return;
        }
        const errorCode = "error" in result ? result.error : "claim_failed";
        setMessage(mapTelegramError(errorCode, t));
        setIsSuccess(false);
        return;
      }

      setBotCodeInput("");
      setPendingBotCode(null);
      setLanguageOptions(null);
      await loadStatus();
      setMessage(t("profilePage.telegram.claimSuccess"));
      setIsSuccess(true);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : t("profilePage.telegram.actionFailed"),
      );
      setIsSuccess(false);
    } finally {
      setIsClaiming(false);
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
      setBotCodeInput("");
      setPendingBotCode(null);
      setLanguageOptions(null);
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
            disabled={isUnlinking || isLinking || isClaiming}
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
            disabled={isLinking || isUnlinking || isClaiming}
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

          <div className="profile-telegram-link">
            <p className="upload-file__profile-hint">{t("profilePage.telegram.botCodeInstructions")}</p>
            <label className="profile-telegram-link__field">
              <span className="upload-file__profile-hint">{t("profilePage.telegram.botCodeLabel")}</span>
              <input
                className="profile-telegram-link__input"
                type="text"
                value={botCodeInput}
                onChange={(event) => setBotCodeInput(event.target.value)}
                placeholder={t("profilePage.telegram.botCodePlaceholder")}
                disabled={isClaiming || Boolean(languageOptions)}
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            {!languageOptions ? (
              <Button
                type="button"
                style="secondary"
                onClick={() => void handleClaimCode()}
                disabled={isClaiming || isLinking || isUnlinking}
              >
                {isClaiming ? t("profilePage.telegram.claimingCode") : t("profilePage.telegram.claimCode")}
              </Button>
            ) : (
              <div className="profile-telegram-link__language-choice">
                <p className="upload-file__profile-hint">{t("profilePage.telegram.languageChoicePrompt")}</p>
                {languageOptions.map((option) => (
                  <Button
                    key={option.source}
                    type="button"
                    style="secondary"
                    onClick={() => void handleClaimCode(option.source)}
                    disabled={isClaiming}
                  >
                    {formatLanguageOption(option, t)}
                  </Button>
                ))}
              </div>
            )}
          </div>
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
