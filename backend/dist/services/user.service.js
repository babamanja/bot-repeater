import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { getPrisma } from "../db/prisma.js";
import * as userRepository from "../db/userRepository.js";
import { trackAuthEvent } from "./analytics.service.js";
export async function getCurrentUser(userId) {
    if (!Number.isInteger(userId) || userId < 1) {
        return { ok: false, status: 401, error: "unauthorized" };
    }
    const row = await userRepository.selectUserById(userId);
    if (!row) {
        return { ok: false, status: 404, error: "user not found" };
    }
    return {
        ok: true,
        user: {
            id: row.id,
            userName: row.user_name,
            email: row.email,
            role: row.role,
            emailVerified: Boolean(row.email_verified_at),
        },
    };
}
export async function updateCurrentUser(userId, body) {
    if (!Number.isInteger(userId) || userId < 1) {
        return { ok: false, status: 401, error: "unauthorized" };
    }
    const userName = body.userName?.trim() ?? "";
    const email = body.email?.trim() ?? "";
    if (!userName || !email) {
        return {
            ok: false,
            status: 400,
            error: "userName, email required",
        };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { ok: false, status: 400, error: "invalid email" };
    }
    try {
        const row = await userRepository.updateUserById(userId, {
            userName,
            email,
        });
        return {
            ok: true,
            user: {
                id: row.id,
                userName: row.user_name,
                email: row.email,
                role: row.role,
                emailVerified: Boolean(row.email_verified_at),
            },
        };
    }
    catch (error) {
        if (error instanceof PrismaClientKnownRequestError) {
            if (error.code === "P2002") {
                return {
                    ok: false,
                    status: 409,
                    error: "email already registered",
                };
            }
            if (error.code === "P2025") {
                return { ok: false, status: 404, error: "user not found" };
            }
        }
        throw error;
    }
}
export async function deleteCurrentUser(userId, requestId) {
    if (!Number.isInteger(userId) || userId < 1) {
        return { ok: false, status: 401, error: "unauthorized" };
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
        return { ok: false, status: 404, error: "user not found" };
    }
    trackAuthEvent({
        event: "account_delete_succeeded",
        authMethod: "account",
        flow: "delete",
        result: "success",
        requestId,
        userId,
    });
    return { ok: true };
}
export async function getUserDashboardStats(userId) {
    if (!Number.isInteger(userId) || userId < 1) {
        return { ok: false, status: 401, error: "unauthorized" };
    }
    const user = await userRepository.selectUserById(userId);
    if (!user) {
        return { ok: false, status: 404, error: "user not found" };
    }
    const stats = await getPrisma().userPair.count({ where: { userId } });
    return {
        ok: true,
        stats: {
            vocabPairCount: stats,
            quizCount: 0,
            attemptCount: 0,
        },
    };
}
