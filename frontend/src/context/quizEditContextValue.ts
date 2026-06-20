import { createContext } from "react";

import type { QuizExtended } from "../types";

export type QuizEditContextValue = {
  quiz: QuizExtended | null;
  isLoading: boolean;
  error: string | null;
  updateTitle: (title: string) => void;
  updatePrompt: (questionId: string, prompt: string) => void;
  updateAnswer: (questionId: string, answerId: string, value: string) => void;
  updateCorrectAnswer: (questionId: string, answerId: string, isCorrect: boolean) => void;
  saveQuizToLocalStorage: (quiz: QuizExtended) => void;
  getQuizFromLocalStorage: () => QuizExtended | null;
  removeQuizFromLocalStorage: () => void;
};

export const QuizEditContext = createContext<QuizEditContextValue | null>(null);
