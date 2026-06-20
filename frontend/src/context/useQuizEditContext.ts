import { useContext } from "react";

import { QuizEditContext, type QuizEditContextValue } from "./quizEditContextValue";

export function useQuizEditContext(): QuizEditContextValue {
  const ctx = useContext(QuizEditContext);
  if (!ctx) {
    throw new Error("useQuizEditContext must be used within QuizEditProvider");
  }
  return ctx;
}

export function useQuizEditContextOptional(): QuizEditContextValue | null {
  return useContext(QuizEditContext);
}
