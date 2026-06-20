import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { trackAnalyticsEvent } from "../../analytics";
import {
  getAdminChunkSummaryPromptTemplate,
  getAdminPromptTemplate,
  resetAdminChunkSummaryPromptTemplate,
  resetAdminPromptTemplate,
  updateAdminChunkSummaryPromptTemplate,
  updateAdminPromptTemplate,
} from "../../api/admin";
import Button from "../../components/UI/Button/Button";
import Page from "../../components/UI/Page";
import PageHeader from "../../components/UI/PageHeader";
import TextArea from "../../components/UI/TextArea";
import "../style.scss";

type PromptTab = "quiz" | "chunkSummary";

export default function AdminPromptPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<PromptTab>("quiz");
  const [quizTemplate, setQuizTemplate] = useState("");
  const [quizDefaultTemplate, setQuizDefaultTemplate] = useState("");
  const [chunkSummaryTemplate, setChunkSummaryTemplate] = useState("");
  const [chunkSummaryDefaultTemplate, setChunkSummaryDefaultTemplate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    trackAnalyticsEvent("admin_prompt_opened", {});
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    Promise.all([getAdminPromptTemplate(), getAdminChunkSummaryPromptTemplate()])
      .then(([quizData, chunkData]) => {
        setQuizTemplate(quizData.template);
        setQuizDefaultTemplate(quizData.defaultTemplate);
        setChunkSummaryTemplate(chunkData.template);
        setChunkSummaryDefaultTemplate(chunkData.defaultTemplate);
      })
      .catch((loadError) => {
        setError(
          loadError instanceof Error ? loadError.message : t("admin.promptSaveFailed"),
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [t]);

  const isQuizTab = activeTab === "quiz";
  const template = isQuizTab ? quizTemplate : chunkSummaryTemplate;
  const defaultTemplate = isQuizTab ? quizDefaultTemplate : chunkSummaryDefaultTemplate;

  function setTemplate(value: string) {
    if (isQuizTab) {
      setQuizTemplate(value);
      return;
    }
    setChunkSummaryTemplate(value);
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = isQuizTab
        ? await updateAdminPromptTemplate(template)
        : await updateAdminChunkSummaryPromptTemplate(template);
      setTemplate(result.template);
      setSuccess(t("admin.promptSaved"));
      trackAnalyticsEvent(
        isQuizTab ? "admin_prompt_saved" : "admin_chunk_summary_prompt_saved",
        {},
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : t("admin.promptSaveFailed"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReset() {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = isQuizTab
        ? await resetAdminPromptTemplate()
        : await resetAdminChunkSummaryPromptTemplate();
      setTemplate(result.template);
      setSuccess(t("admin.promptReset"));
      trackAnalyticsEvent(
        isQuizTab ? "admin_prompt_reset" : "admin_chunk_summary_prompt_reset",
        {},
      );
    } catch (resetError) {
      setError(
        resetError instanceof Error ? resetError.message : t("admin.promptSaveFailed"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Page width="full" className="admin-prompt-page">
      <PageHeader title={t("admin.promptTitle")} />

      <div className="upload-file__source-tabs" role="tablist" aria-label={t("admin.promptTabsLabel")}>
        <button
          type="button"
          role="tab"
          aria-selected={isQuizTab}
          className={`upload-file__source-tab${isQuizTab ? " upload-file__source-tab--active" : ""}`}
          onClick={() => {
            setActiveTab("quiz");
            setSuccess(null);
            setError(null);
          }}
        >
          {t("admin.promptTabQuiz")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={!isQuizTab}
          className={`upload-file__source-tab${!isQuizTab ? " upload-file__source-tab--active" : ""}`}
          onClick={() => {
            setActiveTab("chunkSummary");
            setSuccess(null);
            setError(null);
          }}
        >
          {t("admin.promptTabChunkSummary")}
        </button>
      </div>

      <p className="upload-file__subtitle">
        {isQuizTab ? t("admin.promptDescription") : t("admin.chunkSummaryPromptDescription")}
      </p>
      {error && <p className="upload-file__error upload-file__error--alert">{error}</p>}
      {success && <p>{success}</p>}
      <label className="upload-file__label" htmlFor="admin-prompt-template">
        {t("admin.promptLabel")}
      </label>
      <TextArea
        id="admin-prompt-template"
        className="upload-file__textarea"
        rows={20}
        value={template}
        onChange={(event) => setTemplate(event.target.value)}
        disabled={isLoading || isSaving}
      />
      <div className="upload-file__upload-control">
        <Button onClick={handleSave} disabled={isLoading || isSaving || !template.trim()}>
          {isSaving ? t("upload.sending") : t("admin.savePrompt")}
        </Button>
        <Button style="secondary" onClick={handleReset} disabled={isLoading || isSaving}>
          {t("admin.resetPrompt")}
        </Button>
      </div>
      <p>
        {isQuizTab
          ? t("admin.promptPlaceholderHelp")
          : t("admin.chunkSummaryPromptPlaceholderHelp")}
      </p>
      <details>
        <summary>{t("admin.defaultPrompt")}</summary>
        <pre>{defaultTemplate}</pre>
      </details>
    </Page>
  );
}
