import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { getPrisma } from "../db/prisma.js";
import * as languageRepository from "../db/languageRepository.js";
import * as userRepository from "../db/userRepository.js";
import * as dictionaryRepository from "../db/dictionaryRepository.js";
import { trackAuthEvent } from "./analytics.service.js";

function toUserResponse(row: userRepository.UserRow) {
  return {
    id: row.id,
    userName: row.user_name,
    email: row.email,
    role: row.role,
    emailVerified: Boolean(row.email_verified_at),
    primaryLanguageId: row.primary_language_id,
    learningLanguageId: row.learning_language_id,
  };
}

function parseLanguageId(value: unknown): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return Number.NaN;
}

async function validateLanguagePair(
  primaryLanguageId: number | null | undefined,
  learningLanguageId: number | null | undefined,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const hasPrimary = primaryLanguageId != null;
  const hasLearning = learningLanguageId != null;
  if (hasPrimary !== hasLearning) {
    return {
      ok: false as const,
      status: 400,
      error: "primary and learning language required together",
    };
  }
  if (!hasPrimary || !hasLearning) {
    return { ok: true as const };
  }
  if (primaryLanguageId === learningLanguageId) {
    return {
      ok: false as const,
      status: 400,
      error: "primary and learning language must differ",
    };
  }
  const found = await languageRepository.findLanguagesByIds([
    primaryLanguageId,
    learningLanguageId,
  ]);
  if (found.length !== 2) {
    return { ok: false as const, status: 400, error: "language not found" };
  }
  return { ok: true as const };
}

export async function getCurrentUser(userId: number) {
  if (!Number.isInteger(userId) || userId < 1) {
    return { ok: false as const, status: 401, error: "unauthorized" };
  }
  const row = await userRepository.selectUserById(userId);
  if (!row) {
    return { ok: false as const, status: 404, error: "user not found" };
  }
  return {
    ok: true as const,
    user: toUserResponse(row),
  };
}

export async function listLanguageOptions() {
  const languages = await languageRepository.listLanguages();
  return { ok: true as const, languages };
}

export async function updateCurrentUser(
  userId: number,
  body: {
    userName?: string;
    email?: string;
    primaryLanguageId?: unknown;
    learningLanguageId?: unknown;
  },
) {
  if (!Number.isInteger(userId) || userId < 1) {
    return { ok: false as const, status: 401, error: "unauthorized" };
  }
  const userName = body.userName?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  if (!userName || !email) {
    return {
      ok: false as const,
      status: 400,
      error: "userName, email required",
    };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false as const, status: 400, error: "invalid email" };
  }

  const primaryLanguageId = parseLanguageId(body.primaryLanguageId);
  const learningLanguageId = parseLanguageId(body.learningLanguageId);
  if (Number.isNaN(primaryLanguageId) || Number.isNaN(learningLanguageId)) {
    return { ok: false as const, status: 400, error: "invalid language id" };
  }

  const languageValidation = await validateLanguagePair(
    primaryLanguageId,
    learningLanguageId,
  );
  if (languageValidation.ok === false) {
    return languageValidation;
  }

  try {
    const row = await userRepository.updateUserById(userId, {
      userName,
      email,
      ...(primaryLanguageId !== undefined ? { primaryLanguageId } : {}),
      ...(learningLanguageId !== undefined ? { learningLanguageId } : {}),
    });
    return {
      ok: true as const,
      user: toUserResponse(row),
    };
  } catch (error: unknown) {
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          ok: false as const,
          status: 409,
          error: "email already registered",
        };
      }
      if (error.code === "P2025") {
        return { ok: false as const, status: 404, error: "user not found" };
      }
    }
    throw error;
  }
}

export async function deleteCurrentUser(userId: number, requestId?: string) {
  if (!Number.isInteger(userId) || userId < 1) {
    return { ok: false as const, status: 401, error: "unauthorized" };
  }

  trackAuthEvent({
    event: "account_delete_started",
    authMethod: "account",
    flow: "delete",
    result: "started",
    requestId,
    userId,
  });

  const deleted = await userRepository.softDeleteUserById(userId);
  if (!deleted) {
    trackAuthEvent({
      event: "account_delete_failed",
      authMethod: "account",
      flow: "delete",
      result: "failed",
      reason: "user not found",
      requestId,
      userId,
    });
    return { ok: false as const, status: 404, error: "user not found" };
  }

  trackAuthEvent({
    event: "account_delete_succeeded",
    authMethod: "account",
    flow: "delete",
    result: "success",
    requestId,
    userId,
  });

  return { ok: true as const };
}

export async function listMyWords(
  userId: number,
  input: Omit<userRepository.UserWordsListQuery, "userId">,
) {
  if (!Number.isInteger(userId) || userId < 1) {
    return { ok: false as const, status: 401, error: "unauthorized" };
  }
  const user = await userRepository.selectUserById(userId);
  if (!user) {
    return { ok: false as const, status: 404, error: "user not found" };
  }
  const result = await userRepository.selectUserWords({ ...input, userId });
  return {
    ok: true as const,
    items: result.rows,
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      total: result.total,
      totalPages: Math.max(1, Math.ceil(result.total / input.pageSize)),
    },
  };
}

export async function getUserDashboardStats(userId: number) {
  if (!Number.isInteger(userId) || userId < 1) {
    return { ok: false as const, status: 401, error: "unauthorized" };
  }
  const profile = await userRepository.selectUserById(userId);
  if (!profile) {
    return { ok: false as const, status: 404, error: "user not found" };
  }

  await dictionaryRepository.ensureDefaultDictionaryForUser(userId);

  const prisma = getPrisma();
  const nowMs = BigInt(Date.now());
  const [vocabPairCount, dictionaryCount, dueWordCount, languages] = await Promise.all([
    prisma.dictionaryEntry.count({
      where: { dictionary: { members: { some: { userId } } } },
    }),
    prisma.userDictionary.count({ where: { userId } }),
    prisma.dictionaryEntry.count({
      where: {
        dictionary: { members: { some: { userId } } },
        nextReviewMs: { lte: nowMs },
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        primaryLanguage: { select: { name: true } },
        learningLanguage: { select: { name: true } },
      },
    }),
  ]);

  return {
    ok: true as const,
    stats: {
      vocabPairCount,
      dictionaryCount,
      dueWordCount,
      primaryLanguage: languages?.primaryLanguage?.name ?? null,
      learningLanguage: languages?.learningLanguage?.name ?? null,
    },
  };
}
