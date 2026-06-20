import { getQuizById } from '../../../api/quiz'

const POLL_INTERVAL_MS = 2000
const MAX_ATTEMPTS = 150

export async function waitForQuizReady(quizId: string): Promise<void> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      await getQuizById(quizId)
      return
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (message.includes('quiz generation failed')) {
        throw error
      }
      if (!message.includes('quiz is generating') && !message.includes('quiz is not available')) {
        throw error
      }
    }
    await new Promise((resolve) => window.setTimeout(resolve, POLL_INTERVAL_MS))
  }
  throw new Error('quiz_generation_timeout')
}
