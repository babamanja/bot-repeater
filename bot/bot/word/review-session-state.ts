import { randomBytes } from 'crypto';
import type { DueVocabPair } from '../../domain/vocab';

export const REVIEW_BATCH_SIZE = 5;

type ReviewSession = {
  queue: DueVocabPair[];
  index: number;
  nonce: string;
};

const sessions = new Map<number, ReviewSession>();

function makeNonce(): string {
  return randomBytes(4).toString('hex');
}

export function getReviewSession(telegramUserId: number): ReviewSession | undefined {
  return sessions.get(telegramUserId);
}

/** Starts a batch; returns nonce for the first card, or null if queue is empty. */
export function putReviewSession(telegramUserId: number, queue: DueVocabPair[]): string | null {
  if (queue.length === 0) return null;
  const nonce = makeNonce();
  sessions.set(telegramUserId, { queue, index: 0, nonce });
  return nonce;
}

export function clearReviewSession(telegramUserId: number): void {
  sessions.delete(telegramUserId);
}

export function validateCurrentCard(
  telegramUserId: number,
  pairId: number,
  nonce: string,
): DueVocabPair | null {
  const s = sessions.get(telegramUserId);
  if (!s) return null;
  if (s.nonce !== nonce) return null;
  const card = s.queue[s.index];
  if (!card || card.pairId !== pairId) return null;
  return card;
}

/** After a correct answer on the current card: move to next or clear session. */
export function advanceAfterCardAnswer(telegramUserId: number): { word: DueVocabPair; nonce: string } | null {
  const s = sessions.get(telegramUserId);
  if (!s) return null;
  s.index += 1;
  if (s.index >= s.queue.length) {
    sessions.delete(telegramUserId);
    return null;
  }
  s.nonce = makeNonce();
  return { word: s.queue[s.index], nonce: s.nonce };
}
