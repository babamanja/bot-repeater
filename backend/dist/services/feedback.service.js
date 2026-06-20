import * as feedbackRepository from "../db/feedbackRepository.js";
import * as userRepository from "../db/userRepository.js";
import { sendFeedbackNotificationEmail } from "./postmarkEmail.service.js";
const FEEDBACK_CATEGORIES = new Set(["bug", "feature", "question", "other"]);
const MESSAGE_MIN_LENGTH = 10;
const MESSAGE_MAX_LENGTH = 5000;
export async function submitUserFeedback(userId, body) {
    if (!userId) {
        return { ok: false, status: 401, error: "unauthorized" };
    }
    const category = (body.category ?? "").trim().toLowerCase();
    const message = (body.message ?? "").trim();
    if (!FEEDBACK_CATEGORIES.has(category)) {
        return { ok: false, status: 400, error: "invalid category" };
    }
    if (message.length < MESSAGE_MIN_LENGTH) {
        return { ok: false, status: 400, error: "message too short" };
    }
    if (message.length > MESSAGE_MAX_LENGTH) {
        return { ok: false, status: 400, error: "message too long" };
    }
    const user = await userRepository.selectUserById(userId);
    if (!user) {
        return { ok: false, status: 404, error: "user not found" };
    }
    const feedback = await feedbackRepository.insertUserFeedback({
        userId,
        category,
        message,
    });
    try {
        if (user.email) {
            await sendFeedbackNotificationEmail({
                userName: user.user_name,
                userEmail: user.email,
                category,
                message,
                feedbackId: feedback.id,
            });
        }
    }
    catch (error) {
        console.error("[feedback] Failed to send notification email", {
            feedbackId: feedback.id,
            userId,
            error,
        });
    }
    return {
        ok: true,
        feedback: {
            id: feedback.id,
            category: feedback.category,
            createdAt: feedback.createdAt.toISOString(),
        },
    };
}
export async function listFeedbackForAdmin(input) {
    const category = input.category && FEEDBACK_CATEGORIES.has(input.category)
        ? input.category
        : undefined;
    const result = await feedbackRepository.selectFeedbackForAdmin({
        page: input.page,
        pageSize: input.pageSize,
        search: input.search,
        category,
    });
    const totalPages = Math.max(1, Math.ceil(result.total / input.pageSize));
    const items = result.items.map((row) => ({
        id: row.id,
        userId: row.userId,
        userName: row.userName,
        email: row.email,
        category: row.category,
        message: row.message,
        createdAt: row.createdAt.toISOString(),
    }));
    return {
        ok: true,
        items,
        pagination: {
            page: input.page,
            pageSize: input.pageSize,
            total: result.total,
            totalPages,
        },
    };
}
