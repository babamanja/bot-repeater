import { Prisma } from "@prisma/client";
import { getPrisma } from "./prisma.js";

export type AdminUserRow = {
  id: number;
  userName: string;
  email: string | null;
  telegramId: string | null;
  role: "user" | "admin";
  hasPassword: boolean;
  hasGoogle: boolean;
  hasTelegram: boolean;
  vocabPairCount: number;
};

export type AdminUsersListQuery = {
  page: number;
  pageSize: number;
  sortBy: "id" | "userName" | "email" | "role" | "tokenBalance";
  sortOrder: "asc" | "desc";
  role?: "user" | "admin";
  search?: string;
};

export type AdminUserDetailsRow = {
  id: number;
  userName: string;
  email: string | null;
  telegramId: string | null;
  role: "user" | "admin";
  hasPassword: boolean;
  hasGoogle: boolean;
  hasTelegram: boolean;
  tokenBalance: number;
  vocabPairCount: number;
  subscription: {
    id: string;
    planCode: "basic" | "premium";
    status: "active" | "canceled" | "past_due";
    currentPeriodEnd: string | null;
    createdAt: string;
    paymentId: string | null;
  } | null;
  recentPayments: Array<{
    id: string;
    date: string;
    amount: number;
    currency: string;
    status: "pending" | "succeeded" | "failed" | "refunded";
    transactionType: "payment" | "refund";
    provider: string | null;
  }>;
  recentTokenLedger: Array<{
    id: string;
    delta: number;
    balanceAfter: number | null;
    transactionType:
      | "purchase"
      | "spend"
      | "refund"
      | "bonus"
      | "expire"
      | "admin_adjustment";
    referenceId: string | null;
    createdAt: string;
  }>;
};

export type AppSettingRow = {
  key: string;
  value: unknown;
};

export type AiUsageRecordRow = {
  id: string;
  feature: string;
  createdAt: string;
  userId: number | null;
  status: "success" | "failed";
  sourceTextLength: number;
  estimatedTokens: number;
  aiInputTokens: number | null;
  aiOutputTokens: number | null;
  aiTotalTokens: number | null;
  aiModel: string | null;
  errorMessage: string | null;
};

export type AiUsageRecordsQuery = {
  days: number;
  page: number;
  pageSize: number;
  sortBy: "createdAt" | "aiTotalTokens" | "estimatedTokens" | "sourceTextLength";
  sortOrder: "asc" | "desc";
  status?: "success" | "failed";
  userId?: number;
  search?: string;
};

export async function selectAdminUsers(input: AdminUsersListQuery): Promise<{
  rows: AdminUserRow[];
  total: number;
}> {
  const where = {
    deletedAt: null,
    ...(input.role ? { role: input.role } : {}),
    ...(input.search
      ? {
          OR: [
            {
              userName: {
                contains: input.search,
                mode: "insensitive" as const,
              },
            },
            { email: { contains: input.search, mode: "insensitive" as const } },
            {
              telegramUsername: {
                contains: input.search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    getPrisma().user.findMany({
      where,
      orderBy: { [input.sortBy]: input.sortOrder },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      include: {
        auth: true,
        _count: {
          select: {
            userPairs: true,
          },
        },
      },
    }),
    getPrisma().user.count({ where }),
  ]);

  return {
    rows: rows.map((row) => ({
      id: row.id,
      userName: row.userName,
      email: row.email,
      telegramId: row.telegramId != null ? row.telegramId.toString() : null,
      role: row.role === "admin" ? "admin" : "user",
      hasPassword: Boolean(row.auth?.passwordHash),
      hasGoogle: Boolean(row.auth?.googleSub),
      hasTelegram: row.telegramId != null,
      vocabPairCount: row._count.userPairs,
    })),
    total,
  };
}

export async function selectAdminUserDetailsById(
  userId: number,
): Promise<AdminUserDetailsRow | null> {
  const row = await getPrisma().user.findUnique({
    where: { id: userId },
    include: {
      auth: true,
      subscription: true,
      payments: {
        orderBy: { date: "desc" },
        take: 10,
      },
      tokenLedgerEntries: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      _count: {
        select: {
          userPairs: true,
        },
      },
    },
  });

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userName: row.userName,
    email: row.email,
    telegramId: row.telegramId != null ? row.telegramId.toString() : null,
    role: row.role === "admin" ? "admin" : "user",
    hasPassword: Boolean(row.auth?.passwordHash),
    hasGoogle: Boolean(row.auth?.googleSub),
    hasTelegram: row.telegramId != null,
    tokenBalance: Number(row.tokenBalance),
    vocabPairCount: row._count.userPairs,
    subscription: row.subscription
      ? {
          id: row.subscription.id,
          planCode: row.subscription.planCode,
          status: row.subscription.status,
          currentPeriodEnd: row.subscription.currentPeriodEnd
            ? row.subscription.currentPeriodEnd.toISOString()
            : null,
          createdAt: row.subscription.createdAt.toISOString(),
          paymentId: row.subscription.paymentId,
        }
      : null,
    recentPayments: row.payments.map((payment) => ({
      id: payment.id,
      date: payment.date.toISOString(),
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      transactionType: payment.transactionType,
      provider: payment.provider,
    })),
    recentTokenLedger: row.tokenLedgerEntries.map((entry) => ({
      id: entry.id,
      delta: Number(entry.delta),
      balanceAfter:
        entry.balanceAfter != null ? Number(entry.balanceAfter) : null,
      transactionType: entry.transactionType,
      referenceId: entry.referenceId,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}

export async function selectAppSettingByKey(
  key: string,
): Promise<AppSettingRow | null> {
  const rows = await getPrisma().$queryRaw<
    Array<{ key: string; value: unknown }>
  >(Prisma.sql`SELECT key, value FROM app_settings WHERE key = ${key} LIMIT 1`);
  const row = rows[0];
  if (!row) {
    return null;
  }
  return {
    key: row.key,
    value: row.value,
  };
}

export async function upsertAppSetting(
  key: string,
  value: unknown,
): Promise<AppSettingRow> {
  const payload = value as Prisma.InputJsonValue;
  await getPrisma().$executeRaw(
    Prisma.sql`
      INSERT INTO app_settings (key, value, created_at, updated_at)
      VALUES (${key}, ${payload}::jsonb, NOW(), NOW())
      ON CONFLICT (key)
      DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW()
    `,
  );
  const row = await selectAppSettingByKey(key);
  if (!row) {
    throw new Error("Failed to store app setting");
  }
  return {
    key: row.key,
    value: row.value,
  };
}

export async function selectAiUsageRecords(
  input: AiUsageRecordsQuery,
): Promise<{ rows: AiUsageRecordRow[]; total: number }> {
  const whereClauses: Prisma.AiUsageAnalyticsWhereInput[] = [
    {
      createdAt: {
        gte: new Date(Date.now() - input.days * 24 * 60 * 60 * 1000),
      },
    },
  ];

  if (input.status) {
    whereClauses.push({ status: input.status === "success" ? "success" : "failed" });
  }
  if (input.userId !== undefined) {
    whereClauses.push({ userId: input.userId });
  }
  if (input.search) {
    whereClauses.push({
      OR: [
        { aiModel: { contains: input.search, mode: "insensitive" } },
        { errorMessage: { contains: input.search, mode: "insensitive" } },
        { feature: { contains: input.search, mode: "insensitive" } },
      ],
    });
  }

  const where: Prisma.AiUsageAnalyticsWhereInput =
    whereClauses.length === 1 ? whereClauses[0]! : { AND: whereClauses };

  const sortField =
    input.sortBy === "aiTotalTokens"
      ? "aiTotalTokens"
      : input.sortBy === "estimatedTokens"
        ? "estimatedTokens"
        : input.sortBy === "sourceTextLength"
          ? "sourceTextLength"
          : "createdAt";

  const [rows, total] = await Promise.all([
    getPrisma().aiUsageAnalytics.findMany({
      where,
      orderBy: { [sortField]: input.sortOrder },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
    getPrisma().aiUsageAnalytics.count({ where }),
  ]);

  return {
    rows: rows.map((row) => ({
      id: row.id,
      feature: row.feature,
      createdAt: row.createdAt.toISOString(),
      userId: row.userId,
      status: row.status === "failed" ? "failed" : "success",
      sourceTextLength: row.sourceTextLength,
      estimatedTokens: row.estimatedTokens,
      aiInputTokens: row.aiInputTokens,
      aiOutputTokens: row.aiOutputTokens,
      aiTotalTokens: row.aiTotalTokens,
      aiModel: row.aiModel,
      errorMessage: row.errorMessage,
    })),
    total,
  };
}

export type AdminUserPairRow = {
  id: string;
  userId: number;
  userName: string | null;
  email: string | null;
  vocabPairId: number;
  pimsleurLevel: number;
  nextReviewMs: string;
};

export type AdminUserPairsListQuery = {
  page: number;
  pageSize: number;
  sortBy: "nextReviewMs" | "pimsleurLevel";
  sortOrder: "asc" | "desc";
  search?: string;
};

export async function selectAdminUserPairs(
  input: AdminUserPairsListQuery,
): Promise<{ rows: AdminUserPairRow[]; total: number }> {
  const where: Prisma.UserPairWhereInput = input.search
    ? {
        OR: [
          {
            user: {
              userName: { contains: input.search, mode: "insensitive" },
            },
          },
          {
            user: {
              email: { contains: input.search, mode: "insensitive" },
            },
          },
        ],
      }
    : {};

  const orderBy =
    input.sortBy === "pimsleurLevel"
      ? { pimsleurLevel: input.sortOrder }
      : input.sortOrder === "asc"
        ? { nextReviewMs: "asc" as const }
        : { nextReviewMs: "desc" as const };

  const [rows, total] = await Promise.all([
    getPrisma().userPair.findMany({
      where,
      orderBy,
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      include: {
        user: { select: { id: true, userName: true, email: true } },
      },
    }),
    getPrisma().userPair.count({ where }),
  ]);

  return {
    rows: rows.map((row) => ({
      id: `${row.userId}:${row.vocabPairId}`,
      userId: row.userId,
      userName: row.user.userName,
      email: row.user.email,
      vocabPairId: row.vocabPairId,
      pimsleurLevel: row.pimsleurLevel,
      nextReviewMs: row.nextReviewMs.toString(),
    })),
    total,
  };
}
