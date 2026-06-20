import { toBigInt } from "./telegram-ids";
function buildTelegramUserName(profile) {
    const fromUsername = profile.username?.trim();
    if (fromUsername) {
        return fromUsername;
    }
    const parts = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
    if (parts) {
        return parts;
    }
    return `tg_${profile.id}`;
}
async function ensureDefaultBasicSubscription(prisma, userId) {
    await prisma.subscription.upsert({
        where: { userId },
        update: {},
        create: {
            userId,
            planCode: "basic",
            status: "active",
        },
    });
}
export async function ensureUserByTelegram(prisma, profile) {
    const telegramId = toBigInt(profile.id);
    const existing = await prisma.user.findFirst({
        where: { telegramId, deletedAt: null },
        select: { id: true },
    });
    if (existing) {
        if (profile.username) {
            await prisma.user.update({
                where: { id: existing.id },
                data: { telegramUsername: profile.username },
            });
        }
        return { userId: existing.id, isNew: false };
    }
    const user = await prisma.user.create({
        data: {
            userName: buildTelegramUserName(profile),
            telegramId,
            telegramUsername: profile.username ?? null,
        },
    });
    await ensureDefaultBasicSubscription(prisma, user.id);
    return { userId: user.id, isNew: true };
}
export async function getUserIdByTelegram(prisma, telegramUserId) {
    const row = await prisma.user.findFirst({
        where: { telegramId: toBigInt(telegramUserId), deletedAt: null },
        select: { id: true },
    });
    return row?.id ?? null;
}
export async function getUserLanguages(prisma, telegramUserId) {
    const userId = await getUserIdByTelegram(prisma, telegramUserId);
    if (userId == null) {
        return { primaryLangId: null, learningLangId: null, userId: null };
    }
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { primaryLanguageId: true, learningLanguageId: true },
    });
    return {
        userId,
        primaryLangId: user?.primaryLanguageId ?? null,
        learningLangId: user?.learningLanguageId ?? null,
    };
}
export async function linkTelegramByCode(prisma, profile, code) {
    const normalized = code.trim();
    if (!normalized) {
        return { ok: false, error: "empty code" };
    }
    const link = await prisma.telegramLinkCode.findFirst({
        where: {
            code: normalized,
            usedAt: null,
            expiresAt: { gt: new Date() },
        },
    });
    if (!link) {
        return { ok: false, error: "invalid or expired code" };
    }
    const telegramId = toBigInt(profile.id);
    const conflict = await prisma.user.findFirst({
        where: {
            telegramId,
            deletedAt: null,
            NOT: { id: link.userId },
        },
        select: { id: true },
    });
    if (conflict) {
        return { ok: false, error: "telegram already linked to another account" };
    }
    await prisma.$transaction(async (tx) => {
        await tx.user.update({
            where: { id: link.userId },
            data: {
                telegramId,
                telegramUsername: profile.username ?? null,
                userName: buildTelegramUserName(profile),
            },
        });
        await tx.telegramLinkCode.update({
            where: { id: link.id },
            data: { usedAt: new Date() },
        });
    });
    return { ok: true, userId: link.userId };
}
