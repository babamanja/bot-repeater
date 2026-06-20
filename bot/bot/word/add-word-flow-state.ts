export type AddWordFlowState =
  | { step: 'await_primary'; primaryLangName: string; learningLangName: string }
  | {
      step: 'await_learning';
      primaryWordId: number;
      primaryText: string;
      learningLangName: string;
      suggestedPairs: Array<{ pairId: number; learningText: string }>;
    };

const byTelegramUserId = new Map<number, AddWordFlowState>();

export function getAddWordFlowState(telegramUserId: number): AddWordFlowState | undefined {
  return byTelegramUserId.get(telegramUserId);
}

export function setAddWordFlowState(telegramUserId: number, state: AddWordFlowState): void {
  byTelegramUserId.set(telegramUserId, state);
}

export function clearAddWordFlow(telegramUserId: number): void {
  byTelegramUserId.delete(telegramUserId);
}
