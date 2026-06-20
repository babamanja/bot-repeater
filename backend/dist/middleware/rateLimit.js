import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { resolveOptionalAccessUserId } from "../utils/optionalAuth.js";
function windowMsFromEnv(name, fallbackMinutes) {
    const raw = process.env[name]?.trim();
    const minutes = raw ? Number(raw) : fallbackMinutes;
    if (!Number.isFinite(minutes) || minutes <= 0) {
        return fallbackMinutes * 60 * 1000;
    }
    return minutes * 60 * 1000;
}
function maxFromEnv(name, fallback) {
    const raw = process.env[name]?.trim();
    const value = raw ? Number(raw) : fallback;
    if (!Number.isFinite(value) || value <= 0) {
        return fallback;
    }
    return value;
}
/** Login, signup, password reset, and related auth endpoints. */
export const authRateLimiter = rateLimit({
    windowMs: windowMsFromEnv("RATE_LIMIT_AUTH_WINDOW_MINUTES", 15),
    max: maxFromEnv("RATE_LIMIT_AUTH_MAX", 30),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "too many requests" },
});
/** Paddle and other payment provider webhooks. */
export const webhookRateLimiter = rateLimit({
    windowMs: windowMsFromEnv("RATE_LIMIT_WEBHOOK_WINDOW_MINUTES", 1),
    max: maxFromEnv("RATE_LIMIT_WEBHOOK_MAX", 120),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "too many requests" },
});
/** PDF upload / extract endpoints. */
export const uploadRateLimiter = rateLimit({
    windowMs: windowMsFromEnv("RATE_LIMIT_UPLOAD_WINDOW_MINUTES", 15),
    max: maxFromEnv("RATE_LIMIT_UPLOAD_MAX", 20),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "too many requests" },
});
/** User feedback submissions. */
export const feedbackRateLimiter = rateLimit({
    windowMs: windowMsFromEnv("RATE_LIMIT_FEEDBACK_WINDOW_MINUTES", 60),
    max: maxFromEnv("RATE_LIMIT_FEEDBACK_MAX", 10),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "too many requests" },
});
/** Quiz generation cost/settings preview (public; keyed by user id when Bearer token present). */
export const generationSettingsRateLimiter = rateLimit({
    windowMs: windowMsFromEnv("RATE_LIMIT_GENERATION_SETTINGS_WINDOW_MINUTES", 15),
    max: (req) => {
        const userId = resolveOptionalAccessUserId(req);
        return userId !== null
            ? maxFromEnv("RATE_LIMIT_GENERATION_SETTINGS_AUTH_MAX", 120)
            : maxFromEnv("RATE_LIMIT_GENERATION_SETTINGS_MAX", 30);
    },
    keyGenerator: (req) => {
        const userId = resolveOptionalAccessUserId(req);
        if (userId !== null) {
            return `generation-settings:user:${userId}`;
        }
        return ipKeyGenerator(req.ip ?? "127.0.0.1");
    },
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "too many requests" },
});
/** Start quiz generation (requires auth; keyed by user id when Bearer token present). */
export const quizGenerateRateLimiter = rateLimit({
    windowMs: windowMsFromEnv("RATE_LIMIT_QUIZ_GENERATE_WINDOW_MINUTES", 15),
    max: (req) => {
        const userId = resolveOptionalAccessUserId(req);
        return userId !== null
            ? maxFromEnv("RATE_LIMIT_QUIZ_GENERATE_AUTH_MAX", 20)
            : maxFromEnv("RATE_LIMIT_QUIZ_GENERATE_MAX", 10);
    },
    keyGenerator: (req) => {
        const userId = resolveOptionalAccessUserId(req);
        if (userId !== null) {
            return `quiz-generate:user:${userId}`;
        }
        return ipKeyGenerator(req.ip ?? "127.0.0.1");
    },
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "too many requests" },
});
