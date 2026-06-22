import { apiClient } from "./_api";

export type TelegramLinkStatus = {
  linked: boolean;
  telegramId: string | null;
  telegramUsername: string | null;
};

export type TelegramLinkCode = {
  code: string;
  expiresAt: string;
  deepLink: string | null;
};

export async function getTelegramLinkStatus(): Promise<TelegramLinkStatus> {
  const { data } = await apiClient.get<TelegramLinkStatus>("/telegram/link");
  return data;
}

export async function createTelegramLinkCode(): Promise<TelegramLinkCode> {
  const { data } = await apiClient.post<TelegramLinkCode>("/telegram/link-code");
  return data;
}

export async function unlinkTelegram(): Promise<void> {
  await apiClient.delete("/telegram/link");
}
