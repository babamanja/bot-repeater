import config from '../config.js';
import type { TelegramProfile } from './telegram-user.js';

export type LanguageChoiceOption = {
  source: 'web' | 'telegram';
  primaryLanguageId: number;
  learningLanguageId: number;
  primaryLanguageName: string;
  learningLanguageName: string;
};

type CompleteLinkResult =
  | { ok: true; userId: number }
  | { ok: false; error: string }
  | { ok: false; needsLanguageChoice: true; languageOptions: LanguageChoiceOption[] };

type CreateLinkCodeResult = {
  code: string;
  expiresAt: string;
  profileUrl: string | null;
};

function toApiProfile(profile: TelegramProfile) {
  const fromUsername = profile.username?.trim();
  const parts = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();
  const userName = fromUsername || parts || `tg_${profile.id}`;
  return {
    telegramId: profile.id,
    telegramUsername: profile.username ?? null,
    userName,
  };
}

export async function completeTelegramLinkFromBot(input: {
  profile: TelegramProfile;
  code: string;
  languageSource?: 'web' | 'telegram';
}): Promise<CompleteLinkResult> {
  try {
    const response = await fetch(`${config.backendInternalUrl}/api/internal/telegram/complete-link`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-internal-api-key': config.internalApiKey,
      },
      body: JSON.stringify({
        ...toApiProfile(input.profile),
        code: input.code,
        languageSource: input.languageSource,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      userId?: number;
      error?: string;
      languageOptions?: LanguageChoiceOption[];
    };

    if (
      response.status === 409 &&
      data.error === 'language_choice_required'
    ) {
      return {
        ok: false,
        needsLanguageChoice: true,
        languageOptions: data.languageOptions ?? [],
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        error: typeof data.error === 'string' ? data.error : `request failed (${response.status})`,
      };
    }

    if (typeof data.userId === 'number') {
      return { ok: true, userId: data.userId };
    }

    return { ok: false, error: 'link failed' };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'link failed',
    };
  }
}

export async function createTelegramLinkCodeForBotUser(userId: number): Promise<CreateLinkCodeResult> {
  const response = await fetch(`${config.backendInternalUrl}/api/internal/telegram/link-code`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-internal-api-key': config.internalApiKey,
    },
    body: JSON.stringify({ userId }),
  });

  const data = (await response.json().catch(() => ({}))) as CreateLinkCodeResult & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : `request failed (${response.status})`);
  }
  return data;
}
