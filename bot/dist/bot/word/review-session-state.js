import { randomBytes } from 'crypto';
export const REVIEW_BATCH_SIZE = 5;
const sessions = new Map();
function makeNonce() {
    return randomBytes(4).toString('hex');
}
export function getReviewSession(telegramUserId) {
    return sessions.get(telegramUserId);
}
/** Starts a batch; returns nonce for the first card, or null if queue is empty. */
export function putReviewSession(telegramUserId, queue) {
    if (queue.length === 0)
        return null;
    const nonce = makeNonce();
    sessions.set(telegramUserId, { queue, index: 0, nonce });
    return nonce;
}
export function clearReviewSession(telegramUserId) {
    sessions.delete(telegramUserId);
}
export function validateCurrentCard(telegramUserId, pairId, nonce) {
    const s = sessions.get(telegramUserId);
    if (!s)
        return null;
    if (s.nonce !== nonce)
        return null;
    const card = s.queue[s.index];
    if (!card || card.pairId !== pairId)
        return null;
    return card;
}
/** After a correct answer on the current card: move to next or clear session. */
export function advanceAfterCardAnswer(telegramUserId) {
    const s = sessions.get(telegramUserId);
    if (!s)
        return null;
    s.index += 1;
    if (s.index >= s.queue.length) {
        sessions.delete(telegramUserId);
        return null;
    }
    s.nonce = makeNonce();
    return { word: s.queue[s.index], nonce: s.nonce };
}
