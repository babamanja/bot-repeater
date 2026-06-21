import { Prisma } from "@prisma/client";
import { getPrisma } from "./prisma.js";
export async function selectAdminUsers(input) {
    const where = {
        deletedAt: null,
        ...(input.role ? { role: input.role } : {}),
        ...(input.search
            ? {
                OR: [
                    {
                        userName: {
                            contains: input.search,
                            mode: "insensitive",
                        },
                    },
                    { email: { contains: input.search, mode: "insensitive" } },
                    {
                        telegramUsername: {
                            contains: input.search,
                            mode: "insensitive",
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
export async function selectAdminUserDetailsById(userId) {
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
            balanceAfter: entry.balanceAfter != null ? Number(entry.balanceAfter) : null,
            transactionType: entry.transactionType,
            referenceId: entry.referenceId,
            createdAt: entry.createdAt.toISOString(),
        })),
    };
}
export async function selectAppSettingByKey(key) {
    const rows = await getPrisma().$queryRaw(Prisma.sql `SELECT key, value FROM app_settings WHERE key = ${key} LIMIT 1`);
    const row = rows[0];
    if (!row) {
        return null;
    }
    return {
        key: row.key,
        value: row.value,
    };
}
export async function upsertAppSetting(key, value) {
    const payload = value;
    await getPrisma().$executeRaw(Prisma.sql `
      INSERT INTO app_settings (key, value, created_at, updated_at)
      VALUES (${key}, ${payload}::jsonb, NOW(), NOW())
      ON CONFLICT (key)
      DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW()
    `);
    const row = await selectAppSettingByKey(key);
    if (!row) {
        throw new Error("Failed to store app setting");
    }
    return {
        key: row.key,
        value: row.value,
    };
}
export async function selectAiUsageRecords(input) {
    const whereClauses = [
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
    const where = whereClauses.length === 1 ? whereClauses[0] : { AND: whereClauses };
    const sortField = input.sortBy === "aiTotalTokens"
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
export async function selectAdminUserPairs(input) {
    const where = input.search
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
    const orderBy = input.sortBy === "pimsleurLevel"
        ? { pimsleurLevel: input.sortOrder }
        : input.sortOrder === "asc"
            ? { nextReviewMs: "asc" }
            : { nextReviewMs: "desc" };
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
