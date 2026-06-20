const STORAGE_KEY = 'landing_quiz_progress'

export type LandingQuizProgress = {
  quizId: string
  selectedAnswers: Array<{ questionId: string; answerIds: string[] }>
  currentQuestionIndex: number
  fromLanding: true
}

export function saveLandingQuizProgress(progress: LandingQuizProgress): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // sessionStorage may be unavailable
  }
}

export function readLandingQuizProgress(quizId?: string): LandingQuizProgress | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as LandingQuizProgress
    if (!parsed?.quizId || !parsed.fromLanding || !Array.isArray(parsed.selectedAnswers)) {
      return null
    }
    if (quizId && parsed.quizId !== quizId) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function clearLandingQuizProgress(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // sessionStorage may be unavailable
  }
}

export function isLandingQuizInProgress(quizId: string): boolean {
  return readLandingQuizProgress(quizId) !== null
}
