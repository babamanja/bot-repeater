import type { TelegramLinkInitiator } from "@prisma/client";
import { getPrisma } from "../db/prisma.js";
import {
  mergeTelegramUserIntoWebUser,
  resolveLanguagesForMerge,
  type LanguageSource,
} from "./accountMerge.service.js";
import { randomBytes } from "node:crypto";

const LINK_CODE_TTL_MS = 15 * 60 * 1000;

export type TelegramProfile = {
  telegramId: bigint;
  telegramUsername?: string | null;
  displayName: string;
};

export type LanguageChoiceOption = {
  source: LanguageSource;
  primaryLanguageId: number;
  learningLanguageId: number;
  primaryLanguageName: string;
  learningLanguageName: string;
};

function generateLinkCode(): string {
  return randomBytes(5).toString("hex");
}

async function findValidLinkCode(code: string) {
  return getPrisma().telegramLinkCode.findFirst({
    where: {
      code: code.trim(),
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
}

async function markLinkCodeUsed(linkCodeId: string): Promise<void> {
  await getPrisma().telegramLinkCode.update({
    where: { id: linkCodeId },
    data: { usedAt: new Date() },
  });
}

async function loadLanguageChoiceOptions(
  webUserId: number,
  telegramUserId: number,
): Promise<LanguageChoiceOption[]> {
  const rows = await getPrisma().user.findMany({
    where: { id: { in: [webUserId, telegramUserId] }, deletedAt: null },
    select: {
      id: true,
      primaryLanguageId: true,
      learningLanguageId: true,
      primaryLanguage: { select: { id: true, name: true } },
      learningLanguage: { select: { id: true, name: true } },
    },
  });
  const webUser = rows.find((row) => row.id === webUserId);
  const telegramUser = rows.find((row) => row.id === telegramUserId);
  const options: LanguageChoiceOption[] = [];

  for (const [source, user] of [
    ["web", webUser],
    ["telegram", telegramUser],
  ] as const) {
    if (
      user?.primaryLanguageId != null &&
      user.learningLanguageId != null &&
      user.primaryLanguage &&
      user.learningLanguage
    ) {
      options.push({
        source,
        primaryLanguageId: user.primaryLanguageId,
        learningLanguageId: user.learningLanguageId,
        primaryLanguageName: user.primaryLanguage.name,
        learningLanguageName: user.learningLanguage.name,
      });
    }
  }

  return options;
}

function needsDistinctLanguageChoice(
  webLanguages: { primaryLanguageId: number | null; learningLanguageId: number | null },
  telegramLanguages: { primaryLanguageId: number | null; learningLanguageId: number | null },
): boolean {
  const resolution = resolveLanguagesForMerge({
    webLanguages,
    telegramLanguages,
  });
  return !resolution.ok;
}

export async function createTelegramLinkCode(
  userId: number,
  initiator: TelegramLinkInitiator = "web",
): Promise<{ code: string; expiresAt: string }> {
  const code = generateLinkCode();
  const expiresAt = new Date(Date.now() + LINK_CODE_TTL_MS);
  await getPrisma().telegramLinkCode.create({
    data: { userId, code, expiresAt, initiator },
  });
  return { code, expiresAt: expiresAt.toISOString() };
}

async function linkTelegramToWebUser(input: {
  webUserId: number;
  profile: TelegramProfile;
  languageSource?: LanguageSource;
}): Promise<
  | { ok: true; userId: number }
  | { ok: false; error: string }
  | { ok: false; needsLanguageChoice: true; languageOptions: LanguageChoiceOption[] }
> {
  const prisma = getPrisma();
  const webUser = await prisma.user.findFirst({
    where: { id: input.webUserId, deletedAt: null },
    select: {
      id: true,
      telegramId: true,
      primaryLanguageId: true,
      learningLanguageId: true,
      email: true,
      auth: { select: { passwordHash: true, googleSub: true } },
    },
  });
  if (!webUser) {
    return { ok: false, error: "user not found" };
  }

  const existingTelegramUser = await prisma.user.findFirst({
    where: { telegramId: input.profile.telegramId, deletedAt: null },
    select: {
      id: true,
      telegramId: true,
      primaryLanguageId: true,
      learningLanguageId: true,
      email: true,
      auth: { select: { passwordHash: true, googleSub: true } },
    },
  });

  if (webUser.telegramId === input.profile.telegramId) {
    return { ok: true, userId: webUser.id };
  }
  if (
    webUser.telegramId != null &&
    webUser.telegramId !== input.profile.telegramId
  ) {
    return { ok: false, error: "web account already linked to another telegram" };
  }

  if (!existingTelegramUser) {
    await prisma.user.update({
      where: { id: webUser.id },
      data: {
        telegramId: input.profile.telegramId,
        telegramUsername: input.profile.telegramUsername ?? null,
        userName: input.profile.displayName,
      },
    });
    return { ok: true, userId: webUser.id };
  }

  if (existingTelegramUser.id === webUser.id) {
    return { ok: true, userId: webUser.id };
  }

  if (
    needsDistinctLanguageChoice(webUser, existingTelegramUser) &&
    !input.languageSource
  ) {
    const languageOptions = await loadLanguageChoiceOptions(
      webUser.id,
      existingTelegramUser.id,
    );
    return { ok: false, needsLanguageChoice: true, languageOptions };
  }

  const merged = await mergeTelegramUserIntoWebUser({
    webUserId: webUser.id,
    telegramUserId: existingTelegramUser.id,
    languageSource: input.languageSource,
    telegramId: input.profile.telegramId,
    telegramUsername: input.profile.telegramUsername,
    telegramDisplayName: input.profile.displayName,
  });
  if (!merged.ok) {
    if ("needsLanguageChoice" in merged && merged.needsLanguageChoice) {
      const languageOptions = await loadLanguageChoiceOptions(
        webUser.id,
        existingTelegramUser.id,
      );
      return { ok: false, needsLanguageChoice: true, languageOptions };
    }
    return { ok: false, error: "error" in merged ? merged.error : "merge failed" };
  }

  return { ok: true, userId: webUser.id };
}

export async function completeTelegramLinkFromBot(input: {
  code: string;
  profile: TelegramProfile;
  languageSource?: LanguageSource;
}): Promise<
  | { ok: true; userId: number }
  | { ok: false; error: string }
  | { ok: false; needsLanguageChoice: true; languageOptions: LanguageChoiceOption[] }
> {
  const normalized = input.code.trim();
  if (!normalized) {
    return { ok: false, error: "empty code" };
  }

  const link = await findValidLinkCode(normalized);
  if (!link) {
    return { ok: false, error: "invalid or expired code" };
  }
  if (link.initiator !== "web") {
    return { ok: false, error: "code must be entered on the website" };
  }

  const result = await linkTelegramToWebUser({
    webUserId: link.userId,
    profile: input.profile,
    languageSource: input.languageSource,
  });
  if (result.ok) {
    await markLinkCodeUsed(link.id);
  }
  return result;
}

export async function claimTelegramLinkCodeFromWeb(input: {
  webUserId: number;
  code: string;
  languageSource?: LanguageSource;
}): Promise<
  | { ok: true }
  | { ok: false; status: number; error: string }
  | { ok: false; status: number; needsLanguageChoice: true; languageOptions: LanguageChoiceOption[] }
> {
  if (!Number.isInteger(input.webUserId) || input.webUserId < 1) {
    return { ok: false, status: 401, error: "unauthorized" };
  }

  const normalized = input.code.trim();
  if (!normalized) {
    return { ok: false, status: 400, error: "empty code" };
  }

  const link = await findValidLinkCode(normalized);
  if (!link) {
    return { ok: false, status: 400, error: "invalid or expired code" };
  }
  if (link.initiator !== "telegram") {
    return { ok: false, status: 400, error: "code must be opened in telegram" };
  }
  if (link.userId === input.webUserId) {
    return { ok: false, status: 400, error: "cannot link account to itself" };
  }

  const prisma = getPrisma();
  const [webUser, telegramUser] = await Promise.all([
    prisma.user.findFirst({
      where: { id: input.webUserId, deletedAt: null },
      select: {
        id: true,
        telegramId: true,
        primaryLanguageId: true,
        learningLanguageId: true,
        email: true,
        auth: { select: { passwordHash: true, googleSub: true } },
      },
    }),
    prisma.user.findFirst({
      where: { id: link.userId, deletedAt: null },
      select: {
        id: true,
        telegramId: true,
        telegramUsername: true,
        primaryLanguageId: true,
        learningLanguageId: true,
      },
    }),
  ]);

  if (!webUser) {
    return { ok: false, status: 404, error: "user not found" };
  }
  if (!telegramUser?.telegramId) {
    return { ok: false, status: 400, error: "telegram account not found" };
  }
  if (webUser.telegramId != null && webUser.telegramId !== telegramUser.telegramId) {
    return { ok: false, status: 400, error: "web account already linked to another telegram" };
  }

  if (
    needsDistinctLanguageChoice(webUser, telegramUser) &&
    !input.languageSource
  ) {
    const languageOptions = await loadLanguageChoiceOptions(webUser.id, telegramUser.id);
    return { ok: false, status: 409, needsLanguageChoice: true, languageOptions };
  }

  const merged = await mergeTelegramUserIntoWebUser({
    webUserId: webUser.id,
    telegramUserId: telegramUser.id,
    languageSource: input.languageSource,
    telegramId: telegramUser.telegramId,
    telegramUsername: telegramUser.telegramUsername,
  });
  if (!merged.ok) {
    if ("needsLanguageChoice" in merged && merged.needsLanguageChoice) {
      const languageOptions = await loadLanguageChoiceOptions(webUser.id, telegramUser.id);
      return { ok: false, status: 409, needsLanguageChoice: true, languageOptions };
    }
    return {
      ok: false,
      status: 400,
      error: "error" in merged ? merged.error : "merge failed",
    };
  }

  await markLinkCodeUsed(link.id);
  return { ok: true };
}

export async function isTelegramOnlyUser(userId: number): Promise<boolean> {
  const user = await getPrisma().user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      email: true,
      auth: { select: { passwordHash: true, googleSub: true } },
    },
  });
  if (!user) {
    return false;
  }
  return (
    !user.email?.trim() &&
    !user.auth?.passwordHash &&
    !user.auth?.googleSub
  );
}
