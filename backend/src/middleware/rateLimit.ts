import rateLimit from "express-rate-limit";

import { getAppEnv } from "../config/appEnv.js";

function windowMsFromEnv(name: string, fallbackMinutes: number): number {
  const raw = process.env[name]?.trim();
  const minutes = raw ? Number(raw) : fallbackMinutes;
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return fallbackMinutes * 60 * 1000;
  }
  return minutes * 60 * 1000;
}

function maxFromEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  const value = raw ? Number(raw) : fallback;
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return value;
}

function skipRateLimitInLocal(): boolean {
  return getAppEnv() !== "prod";
}

const rateLimitMessage = { error: "too many requests" };

/** Login, signup, password reset, and other credential-bearing auth endpoints. */
export const authSensitiveRateLimiter = rateLimit({
  windowMs: windowMsFromEnv("RATE_LIMIT_AUTH_WINDOW_MINUTES", 15),
  max: maxFromEnv("RATE_LIMIT_AUTH_MAX", 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
  skip: skipRateLimitInLocal,
});

/** Session maintenance: refresh, guest bootstrap, logout. */
export const authSessionRateLimiter = rateLimit({
  windowMs: windowMsFromEnv("RATE_LIMIT_AUTH_SESSION_WINDOW_MINUTES", 15),
  max: maxFromEnv("RATE_LIMIT_AUTH_SESSION_MAX", 300),
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
  skip: skipRateLimitInLocal,
});

/** @deprecated Use authSensitiveRateLimiter or authSessionRateLimiter. */
export const authRateLimiter = authSensitiveRateLimiter;

/** Paddle and other payment provider webhooks. */
export const webhookRateLimiter = rateLimit({
  windowMs: windowMsFromEnv("RATE_LIMIT_WEBHOOK_WINDOW_MINUTES", 1),
  max: maxFromEnv("RATE_LIMIT_WEBHOOK_MAX", 120),
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
  skip: skipRateLimitInLocal,
});

/** User feedback submissions. */
export const feedbackRateLimiter = rateLimit({
  windowMs: windowMsFromEnv("RATE_LIMIT_FEEDBACK_WINDOW_MINUTES", 60),
  max: maxFromEnv("RATE_LIMIT_FEEDBACK_MAX", 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
  skip: skipRateLimitInLocal,
});
