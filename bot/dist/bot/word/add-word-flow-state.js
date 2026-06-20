const byTelegramUserId = new Map();
export function getAddWordFlowState(telegramUserId) {
    return byTelegramUserId.get(telegramUserId);
}
export function setAddWordFlowState(telegramUserId, state) {
    byTelegramUserId.set(telegramUserId, state);
}
export function clearAddWordFlow(telegramUserId) {
    byTelegramUserId.delete(telegramUserId);
}
