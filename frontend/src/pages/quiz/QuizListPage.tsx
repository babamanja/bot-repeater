import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

import { createRequestId, trackAnalyticsEvent, trackPosthogAnalyticsEvent } from "../../analytics";
import { deleteQuiz, getQuizList, refundQuizTokens, regenerateQuiz } from "../../api/quiz";
import QuizStatusBadge from "../../components/Quiz/QuizStatusBadge";
import { QuizListMobileFooter, QuizListMobileSummary } from "../../components/Quiz/QuizListMobileCard";
import Button from "../../components/UI/Button/Button";
import ButtonLink from "../../components/UI/Button/ButtonLink";
import DeleteIconButton from "../../components/UI/Button/DeleteIconButton";
import ResponsiveDataList from "../../components/UI/ResponsiveDataList";
import type { DataListColumn } from "../../components/UI/dataListTypes";
import type { Quiz, QuizStatus } from "../../types";
import { truncateTextWithTitle } from "../../utils/truncateText";

import "../style.scss";

const POLL_INTERVAL_MS = 3000;

function isPlayableQuiz(status: QuizStatus): boolean {
  return status === "published" || status === "ready_to_edit";
}

function displayTitle(quiz: Quiz, generatingLabel: string): string {
  if (quiz.status === "generating" && !quiz.title.trim()) {
    return generatingLabel;
  }
  const title = quiz.title.trim() || "—";
  if (quiz.chunkNumber != null) {
    return `Part ${quiz.chunkNumber}: ${title}`;
  }
  return title;
}

export default function QuizListPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const highlightQuizId =
    typeof location.state === "object" &&
    location.state !== null &&
    "highlightQuizId" in location.state &&
    typeof (location.state as { highlightQuizId?: unknown }).highlightQuizId === "string"
      ? (location.state as { highlightQuizId: string }).highlightQuizId
      : null;

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [regeneratingQuizId, setRegeneratingQuizId] = useState<string | null>(null);
  const [refundingQuizId, setRefundingQuizId] = useState<string | null>(null);
  const hasTrackedListOpenedRef = useRef(false);

  const loadQuizzes = useCallback(() => {
    return getQuizList()
      .then((data) => {
        setQuizzes(data);
        if (!hasTrackedListOpenedRef.current) {
          hasTrackedListOpenedRef.current = true;
          trackPosthogAnalyticsEvent("quiz_list_opened", {
            request_id: createRequestId(),
            quiz_count: data.length,
          });
        }
      })
      .catch(() => {
        setQuizzes([]);
      });
  }, []);

  useEffect(() => {
    void loadQuizzes();
  }, [loadQuizzes]);

  useEffect(() => {
    const hasGenerating = quizzes.some((quiz) => quiz.status === "generating");
    if (!hasGenerating) {
      return;
    }
    const timer = window.setInterval(() => {
      void loadQuizzes();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [quizzes, loadQuizzes]);

  async function handleDeleteQuiz(quiz: Quiz) {
    if (!window.confirm(t("quizList.deleteConfirm"))) {
      return;
    }
    const requestId = createRequestId();
    trackAnalyticsEvent("quiz_delete_started", {
      quiz_id: quiz.id,
      flow: "delete",
      result: "started",
      request_id: requestId,
    });
    try {
      await deleteQuiz(quiz.id);
      trackAnalyticsEvent("quiz_delete_succeeded", {
        quiz_id: quiz.id,
        flow: "delete",
        result: "success",
        request_id: requestId,
      });
      setDeleteError(null);
      setQuizzes((prev) => prev.filter((q) => q.id !== quiz.id));
    } catch (error) {
      trackAnalyticsEvent("quiz_delete_failed", {
        quiz_id: quiz.id,
        flow: "delete",
        result: "failed",
        reason: error instanceof Error ? error.message : "delete_failed",
        request_id: requestId,
      });
      setDeleteError(error instanceof Error ? error.message : t("quizList.deleteFailed"));
    }
  }

  async function handleRegenerateQuiz(quiz: Quiz) {
    setActionMessage(null);
    setRegeneratingQuizId(quiz.id);
    try {
      await regenerateQuiz(quiz.id);
      setDeleteError(null);
      setQuizzes((prev) =>
        prev.map((row) =>
          row.id === quiz.id
            ? {
                ...row,
                status: "generating",
                canRegenerate: false,
                canRefundTokens: false,
              }
            : row,
        ),
      );
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : t("quizList.regenerateFailed"),
      );
    } finally {
      setRegeneratingQuizId(null);
    }
  }

  async function handleRefundTokens(quiz: Quiz) {
    if (!window.confirm(t("quizList.refundTokensConfirm"))) {
      return;
    }
    setActionMessage(null);
    setRefundingQuizId(quiz.id);
    try {
      const { tokensRefunded } = await refundQuizTokens(quiz.id);
      setDeleteError(null);
      setActionMessage(
        t("quizList.refundTokensSucceeded", { count: tokensRefunded }),
      );
      setQuizzes((prev) =>
        prev.map((row) =>
          row.id === quiz.id
            ? {
                ...row,
                canRegenerate: false,
                canRefundTokens: false,
                tokensRefunded: true,
              }
            : row,
        ),
      );
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : t("quizList.refundTokensFailed"),
      );
    } finally {
      setRefundingQuizId(null);
    }
  }

  const generatingLabel = t("quizList.generatingTitle");

  const columns = useMemo<DataListColumn<Quiz>[]>(
    () => [
      {
        id: "mobileSummary",
        label: "",
        mobileRole: "summary-primary",
        desktopHidden: true,
        render: (quiz) => (
          <QuizListMobileSummary
            quiz={quiz}
            title={displayTitle(quiz, generatingLabel)}
            highlighted={highlightQuizId === quiz.id}
          />
        ),
      },
      {
        id: "title",
        label: t("table.title", { defaultValue: "Title" }),
        hideOnMobile: true,
        cellClassName: "data-table__cell--truncate",
        render: (quiz) => {
          const fullTitle = displayTitle(quiz, generatingLabel);
          const { display, title } = truncateTextWithTitle(fullTitle);
          return (
            <span
              className={
                highlightQuizId === quiz.id
                  ? "quiz-list__title quiz-list__title--highlight"
                  : "quiz-list__title"
              }
              title={title}
            >
              {display}
            </span>
          );
        },
      },
      {
        id: "status",
        label: t("table.status", { defaultValue: "Status" }),
        hideOnMobile: true,
        render: (quiz) => <QuizStatusBadge status={quiz.status} />,
      },
      {
        id: "failedActions",
        label: t("table.failedActions", { defaultValue: "Failed actions" }),
        hideOnMobile: true,
        mobileRole: "detail",
        mobileWide: true,
        render: (quiz) => {
          if (quiz.status !== "failed") {
            return null;
          }
          if (!quiz.canRegenerate && !quiz.canRefundTokens && !quiz.tokensRefunded) {
            return null;
          }
          return (
            <div className="quiz-list__failed-actions">
              {quiz.canRegenerate ? (
                <Button
                  type="button"
                  style="borderless"
                  disabled={regeneratingQuizId === quiz.id || refundingQuizId === quiz.id}
                  onClick={() => void handleRegenerateQuiz(quiz)}
                >
                  {regeneratingQuizId === quiz.id
                    ? t("quizList.regenerating")
                    : t("quizList.regenerate")}
                </Button>
              ) : null}
              {quiz.canRefundTokens ? (
                <Button
                  type="button"
                  style="secondary"
                  disabled={regeneratingQuizId === quiz.id || refundingQuizId === quiz.id}
                  onClick={() => void handleRefundTokens(quiz)}
                >
                  {refundingQuizId === quiz.id
                    ? t("quizList.refundingTokens")
                    : t("quizList.refundTokens")}
                </Button>
              ) : quiz.tokensRefunded ? (
                <span className="quiz-list__action-muted">{t("quizList.tokensRefundedLabel")}</span>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "editQuiz",
        label: t("quizList.edit"),
        hideOnMobile: true,
        header: t("table.editQuiz", { defaultValue: "" }),
        render: (quiz) =>
          isPlayableQuiz(quiz.status) ? (
            <ButtonLink to={`/edit-quiz/${quiz.id}`} style="borderless">
              {t("quizList.edit")}
            </ButtonLink>
          ) : null,
      },
      {
        id: "takeQuiz",
        label: t("quizList.take"),
        hideOnMobile: true,
        header: t("table.takeQuiz", { defaultValue: "" }),
        render: (quiz) =>
          isPlayableQuiz(quiz.status) ? (
            <ButtonLink to={`/quiz/${quiz.id}`} style="borderless">
              {t("quizList.take")}
            </ButtonLink>
          ) : null,
      },
      {
        id: "deleteQuiz",
        label: t("quizList.delete"),
        hideOnMobile: true,
        header: "",
        render: (quiz) => (
          <DeleteIconButton
            type="button"
            aria-label={t("quizList.delete")}
            title={t("quizList.delete")}
            onClick={() => void handleDeleteQuiz(quiz)}
          />
        ),
      },
      {
        id: "mobileActions",
        label: "",
        mobileRole: "footer",
        desktopHidden: true,
        render: (quiz) => (
          <QuizListMobileFooter
            quiz={quiz}
            isRegenerating={regeneratingQuizId === quiz.id}
            isRefunding={refundingQuizId === quiz.id}
            onDelete={() => void handleDeleteQuiz(quiz)}
            onRegenerate={() => void handleRegenerateQuiz(quiz)}
            onRefund={() => void handleRefundTokens(quiz)}
          />
        ),
      },
    ],
    [generatingLabel, highlightQuizId, refundingQuizId, regeneratingQuizId, t],
  );

  return (
    <section className="quiz-list">
      <h1>{t("quizList.title")}</h1>
      {deleteError ? (
        <p className="upload-file__error" role="alert">
          {deleteError}
        </p>
      ) : null}
      {actionMessage ? (
        <p className="upload-file__success" role="status">
          {actionMessage}
        </p>
      ) : null}

      <ResponsiveDataList
        cardClassName="quiz-list-card"
        columns={columns}
        data={quizzes}
        getRowKey={(quiz) => quiz.id}
        defaultOpen={(quiz) => highlightQuizId === quiz.id}
        getCardClassName={(quiz) =>
          highlightQuizId === quiz.id ? "quiz-list-card--highlight" : ""
        }
      />
    </section>
  );
}
