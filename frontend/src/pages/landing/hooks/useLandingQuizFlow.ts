import { useCallback, useEffect, useMemo, useState } from 'react'

import useOptionClick from '../../../hooks/useOptionClick'
import type { QuizExtended } from '../../../types'
import { getQuestionOutcome } from '../../../utils/quizQuestionOutcome'

export const LANDING_DEMO_QUESTION_COUNT = 10

type FlowPhase = 'upload' | 'extracting' | 'ready' | 'generating' | 'quiz' | 'check'

export function useLandingQuizFlow(quiz: QuizExtended | null, phase: FlowPhase) {
  const { selectedAnswers, handleClick } = useOptionClick(quiz)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)

  const questions = quiz?.questions ?? []
  const totalQuestions = questions.length
  const currentQuestion = questions[currentQuestionIndex] ?? null

  useEffect(() => {
    setCurrentQuestionIndex(0)
  }, [quiz?.id])

  const selectedForQuestion = useCallback(
    (questionId: string) =>
      selectedAnswers.find((entry) => entry.questionId === questionId)?.answerIds ?? [],
    [selectedAnswers],
  )

  const isCurrentQuestionAnswered = currentQuestion
    ? selectedForQuestion(currentQuestion.id).length > 0
    : false

  const allAnswered = questions.every(
    (question) => selectedForQuestion(question.id).length > 0,
  )

  const isFirstQuestion = currentQuestionIndex === 0
  const isLastQuestion = totalQuestions > 0 && currentQuestionIndex >= totalQuestions - 1

  const score = useMemo(() => {
    if (phase !== 'check' || !quiz) {
      return null
    }

    let correct = 0
    for (const question of quiz.questions) {
      const outcome = getQuestionOutcome(
        selectedForQuestion(question.id),
        question.correctAnswerIds ?? [],
        question.isMultipleChoice,
      )
      if (outcome === 'correct') {
        correct += 1
      }
    }

    return { correct, total: quiz.questions.length }
  }, [phase, quiz, selectedForQuestion])

  const goToPrevious = useCallback(() => {
    setCurrentQuestionIndex((index) => Math.max(0, index - 1))
  }, [])

  const goToNext = useCallback(() => {
    setCurrentQuestionIndex((index) => Math.min(totalQuestions - 1, index + 1))
  }, [totalQuestions])

  const selectAnswer = useCallback(
    (questionId: string, answerId: string) => {
      handleClick(questionId, answerId)
    },
    [handleClick],
  )

  return {
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    selectedAnswers,
    selectedForQuestion,
    isCurrentQuestionAnswered,
    allAnswered,
    isFirstQuestion,
    isLastQuestion,
    score,
    goToPrevious,
    goToNext,
    selectAnswer,
  }
}
