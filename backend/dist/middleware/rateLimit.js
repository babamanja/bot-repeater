import rateLimit from "express-rate-limit";
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
/** User feedback submissions. */
export const feedbackRateLimiter = rateLimit({
    windowMs: windowMsFromEnv("RATE_LIMIT_FEEDBACK_WINDOW_MINUTES", 60),
    max: maxFromEnv("RATE_LIMIT_FEEDBACK_MAX", 10),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "too many requests" },
});
