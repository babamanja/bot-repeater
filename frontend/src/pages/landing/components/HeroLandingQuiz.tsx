import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  faArrowRight,
  faArrowUpFromBracket,
  faBolt,
  faBullseye,
  faCircleCheck,
  faFileLines,
  faFilePdf,
  faImage,
  faShieldHalved,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons'

import { trackAnalyticsEvent } from '../../../analytics'
import { claimLandingQuiz } from '../../../api/attempt'

import { generateQuiz, getFullQuizById, getQuizById } from '../../../api/quiz'

import QuizContainer from '../../../components/Quiz/QuizContainer'
import Button from '../../../components/UI/Button/Button'
import IconComponent from '../../../components/UI/Icon'
import UploadFile from '../../../components/UI/UploadFile'
import { LANDING_UPLOAD_PROFILE } from '../../../config/generationUploadProfile'

import { isAuthenticatedUser, useSession } from '../../../hooks/useSession'

import type { AuthSession, QuizExtended } from '../../../types'

import { mapFileExtractError } from '../../../utils/fileExtract'

import { extractTextFromUploadFile } from '../../../utils/uploadTextExtraction'

import { ensureGuestSession } from '../hooks/ensureGuestSession'

import { saveLandingQuizProgress } from '../hooks/landingQuizProgress'

import {

  LANDING_DEMO_QUESTION_COUNT,

  useLandingQuizFlow,

} from '../hooks/useLandingQuizFlow'

import { waitForQuizReady } from '../hooks/waitForQuizReady'

const LANDING_DEMO_LOGIN_GATE_QUESTION_INDEX = 4



type HeroLandingQuizProps = {

  onRequireSignup: () => void

  onRequireLoginToContinue: () => void

  registerSignupHandler: (handler: (session: AuthSession) => Promise<void>) => void

  registerContinueHandler: (handler: (session: AuthSession) => Promise<void>) => void

}



type FlowPhase = 'upload' | 'extracting' | 'ready' | 'generating' | 'quiz' | 'check'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIconKind(fileName: string): 'pdf' | 'txt' | 'image' {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.pdf')) {
    return 'pdf'
  }
  if (lower.endsWith('.txt')) {
    return 'txt'
  }
  return 'image'
}
export function HeroLandingQuiz({

  onRequireSignup,

  onRequireLoginToContinue,

  registerSignupHandler,

  registerContinueHandler,

}: HeroLandingQuizProps) {

  const { t } = useTranslation()

  const navigate = useNavigate()

  const { user, token } = useSession()

  const isGuest = Boolean(user?.isGuest)

  const isRegistered = isAuthenticatedUser(user?.role, token) && !isGuest



  const [phase, setPhase] = useState<FlowPhase>('upload')

  const [quiz, setQuiz] = useState<QuizExtended | null>(null)

  const [error, setError] = useState<string | null>(null)

  const [fileName, setFileName] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<number | null>(null)
  const [extractedText, setExtractedText] = useState<string | null>(null)
  const [extractNotice, setExtractNotice] = useState<string | null>(null)



  const {

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

  } = useLandingQuizFlow(quiz, phase)



  const mapFlowError = useCallback(

    (message: string) =>

      message === 'empty_text'

        ? t('landing.hero.demo.errorEmptyFile')

        : message === 'quiz_generation_timeout'

          ? t('landing.hero.demo.errorGenerationTimeout')

          : mapFileExtractError(message, t) || t('landing.hero.demo.errorGeneric'),

    [t],

  )



  const handleFileUpload = useCallback(
    async (file: File) => {
      setError(null)
      setExtractNotice(null)
      setFileName(file.name)
      setFileSize(file.size)
      setPhase('extracting')
      trackAnalyticsEvent('landing_demo_upload_started', {})
      try {
        await ensureGuestSession()
        const extracted = await extractTextFromUploadFile(file, LANDING_UPLOAD_PROFILE)
        if (!extracted.text.trim()) {
          throw new Error('empty_text')
        }
        setExtractedText(extracted.text)
        if (extracted.textTruncated) {
          setExtractNotice(
            t('landing.hero.demo.textTruncatedNotice', {
              max: LANDING_UPLOAD_PROFILE.maxTextChars.toLocaleString(),
            }),
          )
        }
        setPhase('ready')
      } catch (uploadError) {
        const message =
          uploadError instanceof Error ? uploadError.message : t('landing.hero.demo.errorGeneric')
        setError(mapFlowError(message))
        setPhase('upload')
        setFileName(null)
        setFileSize(null)
        setExtractedText(null)
      }
    },
    [mapFlowError, t],
  )



  const handleResetUpload = useCallback(() => {
    setError(null)
    setExtractNotice(null)
    setFileName(null)
    setFileSize(null)
    setExtractedText(null)
    setPhase('upload')
  }, [])


  const handleGenerateQuiz = useCallback(async () => {

    if (!extractedText) {

      return

    }

    setError(null)

    setPhase('generating')

    try {

      const started = await generateQuiz({

        text: extractedText,

        questionCount: LANDING_DEMO_QUESTION_COUNT,

      })

      trackAnalyticsEvent('landing_demo_quiz_generation_started', {

        quiz_id: started.id,

        question_count: LANDING_DEMO_QUESTION_COUNT,

      })

      await waitForQuizReady(started.id)

      const loadedQuiz = await getQuizById(started.id)

      setQuiz(loadedQuiz)

      setPhase('quiz')

      trackAnalyticsEvent('landing_demo_quiz_ready', {

        quiz_id: started.id,

        question_count: loadedQuiz.questions.length,

      })

    } catch (generateError) {

      const message =

        generateError instanceof Error ? generateError.message : t('landing.hero.demo.errorGeneric')

      setError(mapFlowError(message))

      setPhase('ready')

    }

  }, [extractedText, mapFlowError, t])



  const submitAnswers = useCallback(async () => {

    if (!quiz) {

      return

    }

    const fullQuiz = await getFullQuizById(quiz.id)

    setQuiz(fullQuiz)

    setPhase('check')

    trackAnalyticsEvent('landing_demo_checked', {

      question_count: quiz.questions.length,

    })

  }, [quiz])



  const finalizeWithClaim = useCallback(async () => {

    if (!quiz) {

      return

    }

    try {

      await claimLandingQuiz({

        quizId: quiz.id,

        answers: selectedAnswers.map((answer) => ({

          questionId: answer.questionId,

          answerIds: answer.answerIds,

        })),

      })

      await submitAnswers()

    } catch (checkError) {

      const message = checkError instanceof Error ? checkError.message : ''

      if (message === 'signup_required') {

        onRequireSignup()

        return

      }

      if (message === 'insufficient_tokens') {

        navigate('/my-subscription')

        return

      }

      setError(t('landing.hero.demo.errorCheckFailed'))

    }

  }, [navigate, onRequireSignup, quiz, selectedAnswers, submitAnswers, t])



  const handleCheck = useCallback(async () => {

    if (!quiz || !allAnswered) {

      return

    }

    if (isGuest || !isRegistered) {

      onRequireSignup()

      return

    }

    await finalizeWithClaim()

  }, [allAnswered, finalizeWithClaim, isGuest, isRegistered, onRequireSignup, quiz])

  const handleNext = useCallback(() => {
    if (
      phase === 'quiz' &&
      (isGuest || !isRegistered) &&
      currentQuestionIndex === LANDING_DEMO_LOGIN_GATE_QUESTION_INDEX
    ) {
      if (quiz) {
        saveLandingQuizProgress({
          quizId: quiz.id,
          selectedAnswers,
          currentQuestionIndex: currentQuestionIndex + 1,
          fromLanding: true,
        })
      }
      onRequireLoginToContinue()
      return
    }
    goToNext()
  }, [
    currentQuestionIndex,
    goToNext,
    isGuest,
    isRegistered,
    onRequireLoginToContinue,
    phase,
    quiz,
    selectedAnswers,
  ])

  const completeSignupAndCheck = useCallback(
    async (_session: AuthSession) => {

      if (!quiz) {

        return

      }

      await finalizeWithClaim()

    },

    [finalizeWithClaim, quiz],

  )



  const completeLoginAndContinue = useCallback(

    async (_session: AuthSession) => {

      if (!quiz) {

        return

      }

      saveLandingQuizProgress({
        quizId: quiz.id,
        selectedAnswers,
        currentQuestionIndex: currentQuestionIndex + 1,
        fromLanding: true,
      })

      navigate(`/quiz/${quiz.id}`, { replace: true })

    },

    [currentQuestionIndex, navigate, quiz, selectedAnswers],

  )



  useEffect(() => {

    registerSignupHandler(completeSignupAndCheck)

  }, [completeSignupAndCheck, registerSignupHandler])



  useEffect(() => {

    registerContinueHandler(completeLoginAndContinue)

  }, [completeLoginAndContinue, registerContinueHandler])



  const quizContainerState = phase === 'check' ? 'check' : 'test'
  const showQuestion = quiz && currentQuestion && (phase === 'quiz' || phase === 'check')
  const isQuizPlaying = phase === 'quiz' || phase === 'check'
  const isLoadingPhase = phase === 'extracting' || phase === 'generating'



  return (

    <div className="qb-hero__demo">

      {phase !== 'upload' ? (

        <p className="qb-hero__demo-subtitle">{t('landing.hero.demo.subtitle')}</p>

      ) : null}



      {phase === 'upload' ? (

        <UploadFile

          variant="landing"

          onFileChange={handleFileUpload}

          disabled={false}

          maxBytes={LANDING_UPLOAD_PROFILE.maxBytes}

        />

      ) : null}



      {phase === 'ready' ? (
        <div className="qb-hero__demo-ready">
          <div className="qb-hero__demo-ready-inner">
            <div className="qb-hero__demo-ready-main">
              {fileName ? (
                <div className="qb-hero__demo-ready-file">
                  <div className="qb-hero__demo-ready-file-info">
                    <span
                      className={`qb-hero__demo-ready-file-icon qb-hero__demo-ready-file-icon--${fileIconKind(fileName)}`}
                      aria-hidden
                    >
                      <IconComponent
                        faIcon={
                          fileIconKind(fileName) === 'pdf'
                            ? faFilePdf
                            : fileIconKind(fileName) === 'txt'
                              ? faFileLines
                              : faImage
                        }
                        iconClassName="qb-hero__demo-ready-file-icon-fa"
                      />
                    </span>
                    <div className="qb-hero__demo-ready-file-copy">
                      <p className="qb-hero__demo-ready-file-name">{fileName}</p>
                      {fileSize !== null ? (
                        <p className="qb-hero__demo-ready-file-size">
                          {formatFileSize(fileSize)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <span className="qb-hero__demo-ready-file-check" aria-hidden>
                    <IconComponent faIcon={faCircleCheck} iconClassName="qb-hero__demo-ready-file-check-fa" />
                  </span>
                </div>
              ) : null}
              {extractNotice ? (
                <p className="qb-hero__demo-ready-notice" role="status">
                  {extractNotice}
                </p>
              ) : null}
              <div className="qb-hero__demo-ready-divider">
                <span>{t('landing.hero.demo.readyDivider')}</span>
              </div>
              <div className="qb-hero__demo-ready-actions">
                <Button
                  type="button"
                  className="qb-hero__demo-ready-btn"
                  data-cta-id="landing_demo_generate"
                  onClick={() => void handleGenerateQuiz()}
                >
                  <IconComponent
                    faIcon={faWandMagicSparkles}
                    iconClassName="qb-hero__demo-ready-btn-icon"
                  />
                  <span>{t('landing.hero.demo.generateQuiz')}</span>
                </Button>
                <Button
                  type="button"
                  style="secondary"
                  className="qb-hero__demo-ready-btn qb-hero__demo-ready-btn--secondary"
                  onClick={handleResetUpload}
                >
                  <IconComponent
                    faIcon={faArrowUpFromBracket}
                    iconClassName="qb-hero__demo-ready-btn-icon"
                  />
                  <span>{t('landing.hero.demo.uploadAnother')}</span>
                </Button>
              </div>
            </div>
            <ul className="qb-hero__demo-ready-features">
              <li>
                <span className="qb-hero__demo-ready-feature-icon" aria-hidden>
                  <IconComponent faIcon={faCircleCheck} iconClassName="qb-hero__demo-ready-feature-fa" />
                </span>
                <span>{t('landing.hero.demo.upload.features.instant')}</span>
              </li>
              <li>
                <span className="qb-hero__demo-ready-feature-icon" aria-hidden>
                  <IconComponent faIcon={faBolt} iconClassName="qb-hero__demo-ready-feature-fa" />
                </span>
                <span>{t('landing.hero.demo.upload.features.points')}</span>
              </li>
              <li>
                <span className="qb-hero__demo-ready-feature-icon" aria-hidden>
                  <IconComponent faIcon={faBullseye} iconClassName="qb-hero__demo-ready-feature-fa" />
                </span>
                <span>{t('landing.hero.demo.upload.features.results')}</span>
              </li>
            </ul>
          </div>
        </div>
      ) : null}


      {isLoadingPhase && fileName ? (
        <>
          <div className="qb-hero__demo-loading-file">
            <div className="qb-hero__demo-ready-file">
              <div className="qb-hero__demo-ready-file-info">
                <span
                  className={`qb-hero__demo-ready-file-icon qb-hero__demo-ready-file-icon--${fileIconKind(fileName)}`}
                  aria-hidden
                >
                  <IconComponent
                    faIcon={
                      fileIconKind(fileName) === 'pdf'
                        ? faFilePdf
                        : fileIconKind(fileName) === 'txt'
                          ? faFileLines
                          : faImage
                    }
                    iconClassName="qb-hero__demo-ready-file-icon-fa"
                  />
                </span>
                <div className="qb-hero__demo-ready-file-copy">
                  <p className="qb-hero__demo-ready-file-name">{fileName}</p>
                  {fileSize !== null ? (
                    <p className="qb-hero__demo-ready-file-size">{formatFileSize(fileSize)}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="qb-hero__demo-loading-card" role="status" aria-live="polite">
            <div className="qb-hero__demo-loading-main">
              <span className="qb-hero__demo-loading-icon" aria-hidden>
                <IconComponent
                  faIcon={faWandMagicSparkles}
                  iconClassName="qb-hero__demo-loading-icon-fa"
                />
              </span>
              <div className="qb-hero__demo-loading-copy">
                <p className="qb-hero__demo-loading-title">
                  {phase === 'generating'
                    ? t('landing.hero.demo.generatingTitle')
                    : t('landing.hero.demo.extractingTitle')}
                </p>
                <p className="qb-hero__demo-loading-hint">
                  {phase === 'generating'
                    ? t('landing.hero.demo.generatingHint')
                    : t('landing.hero.demo.extractingHint')}
                </p>
              </div>
            </div>
            <div className="qb-hero__demo-loading-secure">
              <IconComponent faIcon={faShieldHalved} iconClassName="qb-hero__demo-loading-secure-icon" />
              <p>{t('landing.hero.demo.secureNotice')}</p>
            </div>
          </div>
        </>
      ) : null}

      {isQuizPlaying && fileName ? (
        <div className="qb-hero__demo-file-pill">
          <IconComponent
            faIcon={
              fileIconKind(fileName) === 'pdf'
                ? faFilePdf
                : fileIconKind(fileName) === 'txt'
                  ? faFileLines
                  : faImage
            }
            iconClassName="qb-hero__demo-file-pill-icon"
          />
          <span>{t('landing.hero.demo.fileLabel', { name: fileName })}</span>
        </div>
      ) : null}

      {isQuizPlaying && quiz ? (
        <>
          <div className="qb-hero__demo-progress-header">
            <p className="qb-hero__demo-progress">
              {t('landing.hero.demo.progress', {
                current: currentQuestionIndex + 1,
                total: totalQuestions,
              })}
            </p>
            <div
              className="qb-hero__demo-progress-bar"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={totalQuestions}
              aria-valuenow={currentQuestionIndex + 1}
              aria-label={t('landing.hero.demo.progress', {
                current: currentQuestionIndex + 1,
                total: totalQuestions,
              })}
            >
              {Array.from({ length: totalQuestions }, (_, index) => (
                <span
                  key={index}
                  className={`qb-hero__demo-progress-segment${
                    index <= currentQuestionIndex ? ' qb-hero__demo-progress-segment--filled' : ''
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="qb-hero__demo-card">
            {showQuestion ? (
              <div className="qb-hero__demo-quiz">
                <QuizContainer
                  key={currentQuestion.id}
                  quiz={quiz}
                  questionId={currentQuestion.id}
                  state={quizContainerState}
                  selectedAnswerIds={selectedForQuestion(currentQuestion.id)}
                  disabled={phase === 'check'}
                  onClick={(answerId) => {
                    if (phase === 'quiz') {
                      trackAnalyticsEvent('landing_demo_answer_selected', {
                        question_id: currentQuestion.id,
                        question_index: currentQuestionIndex,
                      })
                      selectAnswer(currentQuestion.id, answerId)
                    }
                  }}
                />
              </div>
            ) : null}

            <div className="qb-hero__demo-card-footer">
              {phase === 'check' && score ? (
                <p className="qb-hero__demo-score" aria-live="polite">
                  {t('landing.hero.demo.score', {
                    correct: score.correct,
                    total: score.total,
                  })}
                </p>
              ) : null}

              <div className="qb-hero__demo-nav">
                  {!isFirstQuestion ? (
                    <Button
                      type="button"
                      style="secondary"
                      className="qb-hero__demo-nav-btn"
                      onClick={goToPrevious}
                    >
                      <span>{t('landing.hero.demo.previous')}</span>
                    </Button>
                  ) : null}

                  {phase === 'quiz' ? (
                    !isLastQuestion ? (
                      <Button
                        type="button"
                        className="qb-hero__demo-nav-btn"
                        disabled={!isCurrentQuestionAnswered}
                        onClick={handleNext}
                      >
                        <span>{t('landing.hero.demo.next')}</span>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        className="qb-hero__demo-nav-btn"
                        disabled={!allAnswered}
                        data-cta-id="landing_demo_check"
                        onClick={() => void handleCheck()}
                      >
                        <span>{t('landing.hero.demo.check')}</span>
                        <IconComponent faIcon={faArrowRight} iconClassName="qb-hero__demo-nav-icon" />
                      </Button>
                    )
                  ) : !isLastQuestion ? (
                    <Button type="button" className="qb-hero__demo-nav-btn" onClick={goToNext}>
                      <span>{t('landing.hero.demo.next')}</span>
                      <IconComponent faIcon={faArrowRight} iconClassName="qb-hero__demo-nav-icon" />
                    </Button>
                  ) : null}
              </div>
            </div>
          </div>
        </>
      ) : null}

      {error ? (
        <p className="qb-hero__demo-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}



export type { HeroLandingQuizProps }


