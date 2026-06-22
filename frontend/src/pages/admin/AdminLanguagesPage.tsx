import { type FormEvent, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  type AdminLanguage,
  createAdminLanguage,
  deleteAdminLanguage,
  getAdminLanguages,
  updateAdminLanguage,
} from "../../api/admin";
import Button from "../../components/UI/Button/Button";
import Modal from "../../components/UI/Modal";
import Page from "../../components/UI/Page";
import PageHeader from "../../components/UI/PageHeader";
import ResponsiveDataList from "../../components/UI/ResponsiveDataList";
import type { DataListColumn } from "../../components/UI/dataListTypes";
import TextInput from "../../components/UI/TextInput";
import { useAdminPage } from "../../hooks/useAdminPage";

import "../style.scss";

type LanguageFormMode = "create" | "edit";

function mapLanguageError(code: string, t: (key: string) => string): string {
  switch (code) {
    case "language name is required":
      return t("admin.languagesNameRequired");
    case "language name already exists":
      return t("admin.languagesNameExists");
    case "language not found":
      return t("admin.languagesNotFound");
    case "language has vocabulary words":
      return t("admin.languagesHasWords");
    default:
      return t("admin.languagesSaveFailed");
  }
}

export default function AdminLanguagesPage() {
  const { t } = useTranslation();
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<LanguageFormMode>("create");
  const [editingLanguage, setEditingLanguage] = useState<AdminLanguage | null>(null);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingLanguageId, setDeletingLanguageId] = useState<number | null>(null);

  const loadLanguages = useCallback(
    () => getAdminLanguages().then((items) => ({ items })),
    [],
  );

  const {
    data,
    error,
    isLoading,
    reload,
  } = useAdminPage({
    load: loadLanguages,
    loadErrorMessage: t("admin.languagesLoadFailed"),
  });

  const languages = data?.items ?? [];

  function openCreateForm() {
    setFormMode("create");
    setEditingLanguage(null);
    setName("");
    setFormError(null);
    setFormOpen(true);
  }

  function openEditForm(language: AdminLanguage) {
    setFormMode("edit");
    setEditingLanguage(language);
    setName(language.name);
    setFormError(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingLanguage(null);
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError(t("admin.languagesNameRequired"));
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      if (formMode === "create") {
        await createAdminLanguage({ name: trimmedName });
      } else if (editingLanguage) {
        await updateAdminLanguage(editingLanguage.id, { name: trimmedName });
      }
      closeForm();
      await reload();
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : t("admin.languagesSaveFailed");
      setFormError(mapLanguageError(message, t));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(language: AdminLanguage) {
    const userCount = language.primaryUserCount + language.learningUserCount;
    const confirmed = window.confirm(
      t("admin.languagesDeleteConfirm", {
        name: language.name,
        wordCount: language.vocabWordCount,
        userCount,
      }),
    );
    if (!confirmed) {
      return;
    }

    setDeletingLanguageId(language.id);
    try {
      await deleteAdminLanguage(language.id);
      await reload();
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : t("admin.languagesDeleteFailed");
      window.alert(mapLanguageError(message, t));
    } finally {
      setDeletingLanguageId(null);
    }
  }

  const columns = useMemo<DataListColumn<AdminLanguage>[]>(
    () => [
      {
        id: "name",
        label: t("admin.languagesName"),
        mobileRole: "summary-primary",
        render: (language) => language.name,
      },
      {
        id: "vocabWordCount",
        label: t("admin.languagesWordCount"),
        mobileRole: "summary-secondary",
        render: (language) => language.vocabWordCount,
      },
      {
        id: "userCount",
        label: t("admin.languagesUserCount"),
        mobileRole: "detail",
        render: (language) => language.primaryUserCount + language.learningUserCount,
      },
      {
        id: "actions",
        label: t("admin.languagesActions"),
        mobileRole: "detail",
        render: (language) => (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <Button type="button" style="secondary" onClick={() => openEditForm(language)}>
              {t("admin.languagesEdit")}
            </Button>
            <Button
              type="button"
              style="secondary"
              disabled={deletingLanguageId === language.id}
              onClick={() => void handleDelete(language)}
            >
              {deletingLanguageId === language.id
                ? t("admin.languagesDeleting")
                : t("admin.languagesDelete")}
            </Button>
          </div>
        ),
      },
    ],
    [deletingLanguageId, t],
  );

  return (
    <Page width="full">
      <PageHeader
        title={t("admin.languagesTitle")}
        subtitle={t("admin.languagesDescription")}
        actions={
          <Button type="button" onClick={openCreateForm}>
            {t("admin.languagesAdd")}
          </Button>
        }
      />
      {error ? <p className="upload-file__error">{error}</p> : null}
      {isLoading ? <p>{t("admin.languagesLoading")}</p> : null}
      {!isLoading ? (
        <ResponsiveDataList
          columns={columns}
          data={languages}
          getRowKey={(language) => String(language.id)}
          emptyMessage={t("admin.languagesEmpty")}
        />
      ) : null}

      <Modal
        open={formOpen}
        buttons={
          <>
            <Button style="secondary" onClick={closeForm} disabled={isSubmitting}>
              {t("admin.languagesCancel")}
            </Button>
            <Button type="submit" form="admin-language-form" disabled={isSubmitting}>
              {isSubmitting
                ? t("admin.languagesSaving")
                : formMode === "create"
                  ? t("admin.languagesCreate")
                  : t("admin.languagesSave")}
            </Button>
          </>
        }
      >
        <form id="admin-language-form" className="add-word-modal" onSubmit={handleSubmit}>
          <h2 className="add-word-modal__title">
            {formMode === "create"
              ? t("admin.languagesAddTitle")
              : t("admin.languagesEditTitle")}
          </h2>
          {formError ? <p className="upload-file__error">{formError}</p> : null}
          <label className="add-word-modal__hint" htmlFor="admin-language-name">
            {t("admin.languagesName")}
          </label>
          <TextInput
            id="admin-language-name"
            value={name}
            onChange={setName}
            disabled={isSubmitting}
            required
          />
        </form>
      </Modal>
    </Page>
  );
}
