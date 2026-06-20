import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import { trackAnalyticsEvent } from "../../analytics";
import {
  getAdminGenerationSettings,
  type QuizGenerationSettings,
  resetAdminGenerationSettings,
  updateAdminGenerationSettings,
} from "../../api/admin";
import Button from "../../components/UI/Button/Button";
import Page from "../../components/UI/Page";
import PageHeader from "../../components/UI/PageHeader";
import { useAdminPage } from "../../hooks/useAdminPage";
import "../style.scss";

const DEFAULT_SETTINGS: QuizGenerationSettings = {
  tokensPerChar: 0.25,
  tokensPerQuestion: 100,
  questionsPerChunk: 8,
  minQuestions: 3,
  maxQuestions: 20,
  defaultQuestions: 10,
  chunkSizeChars: 12_000,
  chunkOverlapChars: 0,
  tokensPerChunkSummary: 50,
  tokensPerOcrImage: 10,
  signupBonusTokens: 30,
};

export default function AdminTokenSettingsPage() {
  const { t } = useTranslation();

  const loadSettings = useCallback(() => getAdminGenerationSettings(), []);

  const saveSettings = useCallback(async (value: QuizGenerationSettings) => {
    const data = await updateAdminGenerationSettings(value);
    trackAnalyticsEvent("admin_token_settings_saved", {});
    return data;
  }, []);

  const resetSettings = useCallback(async () => {
    const data = await resetAdminGenerationSettings();
    trackAnalyticsEvent("admin_token_settings_reset", {});
    return data;
  }, []);

  const {
    data: settings,
    setData: setSettings,
    isLoading,
    isSaving,
    error,
    success,
    save,
    reset,
  } = useAdminPage({
    initialData: DEFAULT_SETTINGS,
    load: loadSettings,
    save: saveSettings,
    reset: resetSettings,
    loadErrorMessage: t("admin.generationSettingsLoadFailed"),
    saveErrorMessage: t("admin.generationSettingsSaveFailed"),
    resetErrorMessage: t("admin.generationSettingsSaveFailed"),
    saveSuccessMessage: t("admin.generationSettingsSaved"),
    resetSuccessMessage: t("admin.generationSettingsReset"),
    trackOpenEvent: "admin_token_settings_opened",
  });

  const formSettings = settings ?? DEFAULT_SETTINGS;

  return (
    <Page width="full">
      <PageHeader
        title={t("admin.generationSettingsTitle")}
        subtitle={t("admin.generationSettingsDescription")}
      />
      {error && <p className="upload-file__error upload-file__error--alert">{error}</p>}
      {success && <p>{success}</p>}

      <div className="upload-file__form">
        <label className="upload-file__label" htmlFor="signup-bonus-tokens">
          {t("admin.signupBonusTokensLabel")}
        </label>
        <input
          id="signup-bonus-tokens"
          className="upload-file__input"
          type="number"
          min={0}
          step={1}
          value={formSettings.signupBonusTokens}
          onChange={(event) =>
            setSettings((prev) => ({
              ...(prev ?? DEFAULT_SETTINGS),
              signupBonusTokens: Number(event.target.value),
            }))
          }
          disabled={isLoading || isSaving}
        />
        <p className="upload-file__subtitle">{t("admin.signupBonusTokensHint")}</p>

        <label className="upload-file__label" htmlFor="chunk-size-chars">
          {t("admin.chunkSizeCharsLabel")}
        </label>
        <input
          id="chunk-size-chars"
          className="upload-file__input"
          type="number"
          min={2000}
          step={1}
          value={formSettings.chunkSizeChars}
          onChange={(event) =>
            setSettings((prev) => ({
              ...(prev ?? DEFAULT_SETTINGS),
              chunkSizeChars: Number(event.target.value),
            }))
          }
          disabled={isLoading || isSaving}
        />
        <p className="upload-file__subtitle">{t("admin.chunkSizeCharsHint")}</p>

        <label className="upload-file__label" htmlFor="chunk-overlap-chars">
          {t("admin.chunkOverlapCharsLabel")}
        </label>
        <input
          id="chunk-overlap-chars"
          className="upload-file__input"
          type="number"
          min={0}
          step={1}
          value={formSettings.chunkOverlapChars}
          onChange={(event) =>
            setSettings((prev) => ({
              ...(prev ?? DEFAULT_SETTINGS),
              chunkOverlapChars: Number(event.target.value),
            }))
          }
          disabled={isLoading || isSaving}
        />
        <p className="upload-file__subtitle">{t("admin.chunkOverlapCharsHint")}</p>

        <label className="upload-file__label" htmlFor="tokens-per-chunk-summary">
          {t("admin.tokensPerChunkSummaryLabel")}
        </label>
        <input
          id="tokens-per-chunk-summary"
          className="upload-file__input"
          type="number"
          min={0.01}
          step={1}
          value={formSettings.tokensPerChunkSummary}
          onChange={(event) =>
            setSettings((prev) => ({
              ...(prev ?? DEFAULT_SETTINGS),
              tokensPerChunkSummary: Number(event.target.value),
            }))
          }
          disabled={isLoading || isSaving}
        />
        <p className="upload-file__subtitle">{t("admin.tokensPerChunkSummaryHint")}</p>

        <label className="upload-file__label" htmlFor="tokens-per-ocr-image">
          {t("admin.tokensPerOcrImageLabel")}
        </label>
        <input
          id="tokens-per-ocr-image"
          className="upload-file__input"
          type="number"
          min={0.01}
          step={1}
          value={formSettings.tokensPerOcrImage}
          onChange={(event) =>
            setSettings((prev) => ({
              ...(prev ?? DEFAULT_SETTINGS),
              tokensPerOcrImage: Number(event.target.value),
            }))
          }
          disabled={isLoading || isSaving}
        />
        <p className="upload-file__subtitle">{t("admin.tokensPerOcrImageHint")}</p>

        <label className="upload-file__label" htmlFor="tokens-per-char">
          {t("admin.tokensPerCharLabel")}
        </label>
        <input
          id="tokens-per-char"
          className="upload-file__input"
          type="number"
          min={0.01}
          step={0.01}
          value={formSettings.tokensPerChar}
          onChange={(event) =>
            setSettings((prev) => ({
              ...(prev ?? DEFAULT_SETTINGS),
              tokensPerChar: Number(event.target.value),
            }))
          }
          disabled={isLoading || isSaving}
        />

        <label className="upload-file__label" htmlFor="tokens-per-question">
          {t("admin.tokensPerQuestionLabel")}
        </label>
        <input
          id="tokens-per-question"
          className="upload-file__input"
          type="number"
          min={0.01}
          step={1}
          value={formSettings.tokensPerQuestion}
          onChange={(event) =>
            setSettings((prev) => ({
              ...(prev ?? DEFAULT_SETTINGS),
              tokensPerQuestion: Number(event.target.value),
            }))
          }
          disabled={isLoading || isSaving}
        />

        <label className="upload-file__label" htmlFor="questions-per-chunk">
          {t("admin.questionsPerChunkLabel")}
        </label>
        <input
          id="questions-per-chunk"
          className="upload-file__input"
          type="number"
          min={1}
          step={1}
          value={formSettings.questionsPerChunk}
          onChange={(event) =>
            setSettings((prev) => ({
              ...(prev ?? DEFAULT_SETTINGS),
              questionsPerChunk: Number(event.target.value),
            }))
          }
          disabled={isLoading || isSaving}
        />
        <p className="upload-file__subtitle">{t("admin.questionsPerChunkHint")}</p>

        <label className="upload-file__label" htmlFor="min-questions">
          {t("admin.minQuestionsLabel")}
        </label>
        <input
          id="min-questions"
          className="upload-file__input"
          type="number"
          min={1}
          step={1}
          value={formSettings.minQuestions}
          onChange={(event) =>
            setSettings((prev) => ({
              ...(prev ?? DEFAULT_SETTINGS),
              minQuestions: Number(event.target.value),
            }))
          }
          disabled={isLoading || isSaving}
        />

        <label className="upload-file__label" htmlFor="max-questions">
          {t("admin.maxQuestionsLabel")}
        </label>
        <input
          id="max-questions"
          className="upload-file__input"
          type="number"
          min={1}
          step={1}
          value={formSettings.maxQuestions}
          onChange={(event) =>
            setSettings((prev) => ({
              ...(prev ?? DEFAULT_SETTINGS),
              maxQuestions: Number(event.target.value),
            }))
          }
          disabled={isLoading || isSaving}
        />

        <label className="upload-file__label" htmlFor="default-questions">
          {t("admin.defaultQuestionsLabel")}
        </label>
        <input
          id="default-questions"
          className="upload-file__input"
          type="number"
          min={1}
          step={1}
          value={formSettings.defaultQuestions}
          onChange={(event) =>
            setSettings((prev) => ({
              ...(prev ?? DEFAULT_SETTINGS),
              defaultQuestions: Number(event.target.value),
            }))
          }
          disabled={isLoading || isSaving}
        />
      </div>

      <div className="upload-file__upload-control">
        <Button onClick={save} disabled={isLoading || isSaving}>
          {isSaving ? t("upload.sending") : t("admin.saveGenerationSettings")}
        </Button>
        <Button style="secondary" onClick={reset} disabled={isLoading || isSaving || !reset}>
          {t("admin.resetGenerationSettings")}
        </Button>
      </div>
    </Page>
  );
}
