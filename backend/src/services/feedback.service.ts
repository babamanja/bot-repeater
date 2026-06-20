import * as feedbackRepository from "../db/feedbackRepository.js";
import * as userRepository from "../db/userRepository.js";
import { sendFeedbackNotificationEmail } from "./postmarkEmail.service.js";

const FEEDBACK_CATEGORIES = new Set(["bug", "feature", "question", "other"]);
const MESSAGE_MIN_LENGTH = 10;
const MESSAGE_MAX_LENGTH = 5000;

export type FeedbackCategory = "bug" | "feature" | "question" | "other";

export async function submitUserFeedback(
  userId: number | undefined,
  body: { category?: string; message?: string },
) {
  if (!userId) {
    return { ok: false as const, status: 401, error: "unauthorized" };
  }

  const category = (body.category ?? "").trim().toLowerCase();
  const message = (body.message ?? "").trim();

  if (!FEEDBACK_CATEGORIES.has(category)) {
    return { ok: false as const, status: 400, error: "invalid category" };
  }
  if (message.length < MESSAGE_MIN_LENGTH) {
    return { ok: false as const, status: 400, error: "message too short" };
  }
  if (message.length > MESSAGE_MAX_LENGTH) {
    return { ok: false as const, status: 400, error: "message too long" };
  }

  const user = await userRepository.selectUserById(userId);
  if (!user) {
    return { ok: false as const, status: 404, error: "user not found" };
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
  } catch (error) {
    console.error("[feedback] Failed to send notification email", {
      feedbackId: feedback.id,
      userId,
      error,
    });
  }

  return {
    ok: true as const,
    feedback: {
      id: feedback.id,
      category: feedback.category as FeedbackCategory,
      createdAt: feedback.createdAt.toISOString(),
    },
  };
}

export type AdminFeedbackItem = {
  id: string;
  userId: number;
  userName: string;
  email: string;
  category: FeedbackCategory;
  message: string;
  createdAt: string;
};

export async function listFeedbackForAdmin(input: {
  page: number;
  pageSize: number;
  search?: string;
  category?: string;
}) {
  const category =
    input.category && FEEDBACK_CATEGORIES.has(input.category)
      ? (input.category as FeedbackCategory)
      : undefined;

  const result = await feedbackRepository.selectFeedbackForAdmin({
    page: input.page,
    pageSize: input.pageSize,
    search: input.search,
    category,
  });

  const totalPages = Math.max(1, Math.ceil(result.total / input.pageSize));
  const items: AdminFeedbackItem[] = result.items.map((row) => ({
    id: row.id,
    userId: row.userId,
    userName: row.userName,
    email: row.email,
    category: row.category as FeedbackCategory,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
  }));

  return {
    ok: true as const,
    items,
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      total: result.total,
      totalPages,
    },
  };
}
