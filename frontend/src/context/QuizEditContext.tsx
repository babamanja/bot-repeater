import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { trackAnalyticsEvent } from "../analytics";
import { getFullQuizById } from "../api/quiz";
import useRequestState from "../hooks/useRequestState";
import type { QuizExtended } from "../types";
import { QuizEditContext, type QuizEditContextValue } from "./quizEditContextValue";
import {
  updateAnswerInQuiz,
  updateCorrectAnswerInQuiz,
  updatePromptInQuiz,
  updateTitleInQuiz,
} from "../utils/quizEditUpdates";

const QUIZ_EDIT_CHANGE_DEBOUNCE_MS = 800;

type QuizEditProviderProps = {
  quizId: string;
  children: ReactNode;
};

export default function QuizEditProvider({ quizId, children }: QuizEditProviderProps) {
  const [quiz, setQuiz] = useState<QuizExtended | null>(null);
  const { isLoading, setIsLoading, error, setError } = useRequestState();
  const editChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasEmittedEditOpenedRef = useRef(false);

  const storageKey = `quiz-${quizId}`;

  const scheduleQuizEditChanged = useCallback(() => {
    if (!quizId) {
      return;
    }
    if (editChangeTimerRef.current) {
      clearTimeout(editChangeTimerRef.current);
    }
    editChangeTimerRef.current = setTimeout(() => {
      editChangeTimerRef.current = null;
      trackAnalyticsEvent("quiz_edit_changed", { quiz_id: quizId });
    }, QUIZ_EDIT_CHANGE_DEBOUNCE_MS);
  }, [quizId]);

  useEffect(() => {
    hasEmittedEditOpenedRef.current = false;
  }, [quizId]);

  useEffect(() => {
    return () => {
      if (editChangeTimerRef.current) {
        clearTimeout(editChangeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!quiz) {
      return;
    }
    if (hasEmittedEditOpenedRef.current) {
      return;
    }
    hasEmittedEditOpenedRef.current = true;
    trackAnalyticsEvent("quiz_edit_opened", {
      quiz_id: quiz.id,
      question_count: quiz.questions.length,
    });
  }, [quiz]);

  const getQuizFromLocalStorage = useCallback((): QuizExtended | null => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as QuizExtended;
    } catch {
      return null;
    }
  }, [storageKey]);

  const saveQuizToLocalStorage = useCallback(
    (next: QuizExtended) => {
      localStorage.setItem(storageKey, JSON.stringify(next));
    },
    [storageKey],
  );

  const removeQuizFromLocalStorage = useCallback(() => {
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (!quizId) {
      setQuiz(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setError(null);
      setQuiz(null);

      const fromLs = getQuizFromLocalStorage();
      if (fromLs) {
        if (!cancelled) {
          setQuiz(fromLs);
        }
        setIsLoading(false);
        return;
      }

      try {
        const loaded = await getFullQuizById(quizId);
        if (cancelled) {
          return;
        }
        saveQuizToLocalStorage(loaded);
        setQuiz(loaded);
      } catch (error) {
        if (!cancelled) {
          setError(error instanceof Error ? error.message : "Failed to load quiz");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [quizId, getQuizFromLocalStorage, saveQuizToLocalStorage, setIsLoading, setError]);

  useEffect(() => {
    if (!quiz) {
      return;
    }
    saveQuizToLocalStorage(quiz);
  }, [quiz, saveQuizToLocalStorage]);

  const updateTitle = useCallback(
    (title: string) => {
      setQuiz((prev) => (prev ? updateTitleInQuiz(prev, title) : null));
      scheduleQuizEditChanged();
    },
    [scheduleQuizEditChanged],
  );

  const updatePrompt = useCallback(
    (questionId: string, prompt: string) => {
      setQuiz((prev) => (prev ? updatePromptInQuiz(prev, questionId, prompt) : null));
      scheduleQuizEditChanged();
    },
    [scheduleQuizEditChanged],
  );

  const updateAnswer = useCallback(
    (questionId: string, answerId: string, value: string) => {
      setQuiz((prev) =>
        prev ? updateAnswerInQuiz(prev, questionId, answerId, value) : null,
      );
      scheduleQuizEditChanged();
    },
    [scheduleQuizEditChanged],
  );

  const updateCorrectAnswer = useCallback(
    (questionId: string, answerId: string, isCorrect: boolean) => {
      setQuiz((prev) =>
        prev ? updateCorrectAnswerInQuiz(prev, questionId, answerId, isCorrect) : null,
      );
      scheduleQuizEditChanged();
    },
    [scheduleQuizEditChanged],
  );

  const value = useMemo<QuizEditContextValue>(
    () => ({
      quiz,
      isLoading,
      error,
      updateTitle,
      updatePrompt,
      updateAnswer,
      updateCorrectAnswer,
      saveQuizToLocalStorage,
      getQuizFromLocalStorage,
      removeQuizFromLocalStorage,
    }),
    [
      quiz,
      isLoading,
      error,
      updateTitle,
      updatePrompt,
      updateAnswer,
      updateCorrectAnswer,
      saveQuizToLocalStorage,
      getQuizFromLocalStorage,
      removeQuizFromLocalStorage,
    ],
  );

  return <QuizEditContext.Provider value={value}>{children}</QuizEditContext.Provider>;
}
