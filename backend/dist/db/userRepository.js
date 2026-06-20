import { getPrisma } from "./prisma.js";
function toRow(u) {
    return {
        id: u.id,
        user_name: u.userName,
        email: u.email,
        role: u.role === "admin" ? "admin" : "user",
        email_verified_at: u.emailVerifiedAt,
        is_guest: u.isGuest,
    };
}
export async function isGuestUser(id) {
    const u = await getPrisma().user.findFirst({
        where: { id, deletedAt: null },
        select: { isGuest: true },
    });
    return Boolean(u?.isGuest);
}
export async function selectUserById(id) {
    const u = await getPrisma().user.findFirst({ where: { id, deletedAt: null } });
    return u ? toRow(u) : null;
}
export async function updateUserById(id, input) {
    const prisma = getPrisma();
    const existing = await prisma.user.findUnique({ where: { id } });
    const nextEmail = input.email.trim().toLowerCase();
    const emailChanged = existing !== null &&
        existing.email != null &&
        existing.email.trim().toLowerCase() !== nextEmail;
    const u = await prisma.user.update({
        where: { id },
        data: {
            userName: input.userName.trim(),
            email: nextEmail,
            ...(emailChanged ? { emailVerifiedAt: null } : {}),
        },
    });
    return toRow(u);
}
export async function softDeleteUserById(id) {
    const prisma = getPrisma();
    const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
        return false;
    }
    const deletedAt = new Date();
    const anonymizedEmail = `deleted+${id}+${deletedAt.getTime()}@deleted.local`;
    const anonymizedName = `Buddy ${id}`;
    const previousEmail = existing.email?.trim().toLowerCase() ?? "";
    const result = await prisma.user.updateMany({
        where: { id, deletedAt: null },
        data: {
            deletedAt,
            previousEmailForRecovery: previousEmail,
            email: anonymizedEmail,
            userName: anonymizedName,
        },
    });
    return result.count > 0;
}
export async function restoreSoftDeletedUser(id) {
    const prisma = getPrisma();
    const user = await prisma.user.findFirst({
        where: { id, deletedAt: { not: null } },
    });
    if (!user?.previousEmailForRecovery) {
        return false;
    }
    const restoredEmail = user.previousEmailForRecovery.trim().toLowerCase();
    await prisma.user.update({
        where: { id },
        data: {
            deletedAt: null,
            email: restoredEmail,
            previousEmailForRecovery: null,
        },
    });
    return true;
}
