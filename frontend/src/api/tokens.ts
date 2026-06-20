import { apiClient } from "./_api";

export type MyTokensResponse = {
  balance: number;
};

export type PurchaseTokensResponse = {
  balance: number;
  purchasedAmount: number;
};

type TokenBalanceListener = (balance: number) => void;

const tokenBalanceListeners = new Set<TokenBalanceListener>();

export function subscribeToMyTokenBalance(listener: TokenBalanceListener): () => void {
  tokenBalanceListeners.add(listener);
  return () => {
    tokenBalanceListeners.delete(listener);
  };
}

function notifyTokenBalanceListeners(balance: number): void {
  for (const listener of tokenBalanceListeners) {
    listener(balance);
  }
}

export async function getMyTokens(): Promise<MyTokensResponse> {
  const { data } = await apiClient.get<MyTokensResponse>("/tokens/me");
  return data;
}

/** Fetches /tokens/me and notifies all subscribers (e.g. AppLayout header). */
export async function refreshMyTokenBalance(): Promise<number | null> {
  try {
    const { balance } = await getMyTokens();
    notifyTokenBalanceListeners(balance);
    return balance;
  } catch {
    return null;
  }
}

export async function purchaseTokens(amount: number): Promise<PurchaseTokensResponse> {
  const { data } = await apiClient.post<PurchaseTokensResponse>("/tokens/purchase", { amount });
  return data;
}
