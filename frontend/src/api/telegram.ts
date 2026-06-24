import axios from "axios";

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

export type LanguageChoiceOption = {
  source: "web" | "telegram";
  primaryLanguageId: number;
  learningLanguageId: number;
  primaryLanguageName: string;
  learningLanguageName: string;
};

export type ClaimTelegramLinkCodeResult =
  | { ok: true }
  | { ok: false; needsLanguageChoice: true; languageOptions: LanguageChoiceOption[] }
  | { ok: false; error: string };

export async function getTelegramLinkStatus(): Promise<TelegramLinkStatus> {
  const { data } = await apiClient.get<TelegramLinkStatus>("/telegram/link");
  return data;
}

export async function createTelegramLinkCode(): Promise<TelegramLinkCode> {
  const { data } = await apiClient.post<TelegramLinkCode>("/telegram/link-code");
  return data;
}

export async function claimTelegramLinkCode(
  code: string,
  languageSource?: "web" | "telegram",
): Promise<ClaimTelegramLinkCodeResult> {
  try {
    await apiClient.post("/telegram/link-code/claim", { code, languageSource });
    return { ok: true };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 409) {
      const body = error.response.data as {
        error?: string;
        languageOptions?: LanguageChoiceOption[];
      };
      if (body.error === "language_choice_required" && body.languageOptions) {
        return {
          ok: false,
          needsLanguageChoice: true,
          languageOptions: body.languageOptions,
        };
      }
    }

    const message =
      axios.isAxiosError(error) && typeof error.response?.data?.error === "string"
        ? error.response.data.error
        : error instanceof Error
          ? error.message
          : "claim_failed";
    return { ok: false, error: message };
  }
}

export async function unlinkTelegram(): Promise<void> {
  await apiClient.delete("/telegram/link");
}
