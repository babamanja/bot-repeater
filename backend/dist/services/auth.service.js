import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import * as authRepository from "../db/authRepository.js";
import * as userRepository from "../db/userRepository.js";
import { isPostmarkConfigured, resolveAuthEmailAppBase, sendEmailVerificationEmail, sendPasswordResetEmail, } from "./postmarkEmail.service.js";
import { grantSignupBonusTokens } from "./signupBonus.service.js";
import * as subscriptionRepository from "../db/subscriptionRepository.js";
import { convertGuestWithGoogle, convertGuestWithPassword, createGuestUser, mergeGuestIntoUser, } from "./guest.service.js";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "30d";
const PASSWORD_RESET_EXPIRES_IN = "30m";
const EMAIL_VERIFY_EXPIRES_IN = "7d";
function userAuthRowToAuthUser(row) {
    return {
        id: row.id,
        userName: row.userName,
        email: row.email,
        role: row.role,
        passwordHash: row.passwordHash,
        googleSub: row.googleSub,
        emailVerifiedAt: row.emailVerifiedAt,
        isGuest: row.isGuest,
    };
}
function getJwtSecret() {
    const secret = process.env.AUTH_JWT_SECRET?.trim();
    if (!secret) {
        throw new Error("AUTH_JWT_SECRET is required");
    }
    return secret;
}
function getRefreshJwtSecret() {
    const secret = process.env.AUTH_REFRESH_SECRET?.trim();
    if (!secret) {
        throw new Error("AUTH_REFRESH_SECRET is required");
    }
    return secret;
}
function getPasswordResetSecret() {
    const explicitSecret = process.env.AUTH_PASSWORD_RESET_SECRET?.trim();
    if (explicitSecret) {
        return explicitSecret;
    }
    return getJwtSecret();
}
function getGoogleClientId() {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    if (!clientId) {
        throw new Error("GOOGLE_CLIENT_ID is required");
    }
    return clientId;
}
function signRefreshToken(user) {
    return jwt.sign({ sub: user.id, type: "refresh" }, getRefreshJwtSecret(), {
        expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });
}
function createAuthResponse(user, options) {
    const token = jwt.sign({ sub: user.id, email: user.email, type: "access" }, getJwtSecret(), {
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });
    const base = {
        token,
        user: {
            id: user.id,
            userName: user.userName,
            email: user.email,
            role: user.role,
            emailVerified: Boolean(user.emailVerifiedAt),
            isGuest: user.isGuest,
        },
        providers: {
            password: Boolean(user.passwordHash),
            google: Boolean(user.googleSub),
        },
    };
    if (typeof options?.isNewUser === "boolean") {
        return { ...base, isNewUser: options.isNewUser };
    }
    return base;
}
function createAuthResult(user, options) {
    return {
        auth: createAuthResponse(user, options),
        refreshToken: signRefreshToken(user),
    };
}
export async function createGuestSession() {
    const row = await createGuestUser();
    return { ok: true, ...createAuthResult(userAuthRowToAuthUser(row), { isNewUser: true }) };
}
export async function signUpWithPassword(body, options) {
    const userName = body.userName?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    if (!userName || !email || !password) {
        return {
            ok: false,
            status: 400,
            error: "userName, email, password required",
        };
    }
    if (!EMAIL_REGEX.test(email)) {
        return { ok: false, status: 400, error: "invalid email" };
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
        return {
            ok: false,
            status: 400,
            error: `password must be at least ${PASSWORD_MIN_LENGTH} characters`,
        };
    }
    const existing = await authRepository.selectAuthByEmail(email);
    const guestUserId = Number.isInteger(options?.guestUserId) && (options?.guestUserId ?? 0) > 0
        ? Number(options?.guestUserId)
        : null;
    if (guestUserId) {
        const passwordHash = await bcrypt.hash(password, 12);
        const converted = await convertGuestWithPassword({
            guestUserId,
            userName,
            email,
            passwordHash,
        });
        if (converted.ok === false) {
            return {
                ok: false,
                status: converted.status,
                error: converted.error,
            };
        }
        const row = converted.row;
        const appBase = resolveAuthEmailAppBase(body.appBaseUrl?.trim());
        if (isPostmarkConfigured() && appBase) {
            const verifyToken = jwt.sign({ sub: row.id, type: "email_verify" }, getJwtSecret(), { expiresIn: EMAIL_VERIFY_EXPIRES_IN });
            const verifyUrl = `${appBase}/login?verifyToken=${encodeURIComponent(verifyToken)}`;
            try {
                await sendEmailVerificationEmail({
                    to: email,
                    verifyUrl,
                    userName: row.userName,
                });
            }
            catch (error) {
                console.error("[auth] Failed to send verification email", { email, error });
            }
        }
        return { ok: true, ...createAuthResult(row, { isNewUser: true }) };
    }
    if (existing) {
        return {
            ok: false,
            status: 409,
            error: "email already registered",
        };
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const row = await authRepository.upsertPasswordAuth({
        userName,
        email,
        passwordHash,
    });
    const appBase = resolveAuthEmailAppBase(body.appBaseUrl?.trim());
    if (isPostmarkConfigured() && appBase) {
        const verifyToken = jwt.sign({ sub: row.id, type: "email_verify" }, getJwtSecret(), { expiresIn: EMAIL_VERIFY_EXPIRES_IN });
        const verifyUrl = `${appBase}/login?verifyToken=${encodeURIComponent(verifyToken)}`;
        try {
            await sendEmailVerificationEmail({
                to: email,
                verifyUrl,
                userName: row.userName,
            });
        }
        catch (error) {
            console.error("[auth] Failed to send verification email", { email, error });
        }
    }
    else if (process.env.NODE_ENV !== "production") {
        const verifyToken = jwt.sign({ sub: row.id, type: "email_verify" }, getJwtSecret(), { expiresIn: EMAIL_VERIFY_EXPIRES_IN });
        console.info("[auth] Email verification token (dev)", {
            email,
            verifyToken,
            hint: "Use POST /api/auth/email/verify with { token } or open /login?verifyToken=…",
        });
    }
    await grantSignupBonusTokens(row.id);
    await subscriptionRepository.ensureDefaultBasicSubscription(row.id);
    return { ok: true, ...createAuthResult(row, { isNewUser: true }) };
}
export async function logInWithPassword(body, options) {
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    if (!email || !password) {
        return {
            ok: false,
            status: 400,
            error: "email, password required",
        };
    }
    if (!EMAIL_REGEX.test(email)) {
        return { ok: false, status: 400, error: "invalid email" };
    }
    const row = await authRepository.selectAuthByEmail(email);
    if (!row?.passwordHash) {
        return { ok: false, status: 401, error: "invalid credentials" };
    }
    if (row.deletedAt) {
        const isValidForDeleted = await bcrypt.compare(password, row.passwordHash);
        if (!isValidForDeleted) {
            return { ok: false, status: 401, error: "invalid credentials" };
        }
        return { ok: false, status: 403, error: "account deleted" };
    }
    const isValid = await bcrypt.compare(password, row.passwordHash);
    if (!isValid) {
        return { ok: false, status: 401, error: "invalid credentials" };
    }
    const guestUserId = Number.isInteger(options?.guestUserId) && (options?.guestUserId ?? 0) > 0
        ? Number(options?.guestUserId)
        : null;
    if (guestUserId && guestUserId !== row.id) {
        await mergeGuestIntoUser(guestUserId, row.id);
    }
    return { ok: true, ...createAuthResult(row) };
}
function deriveUserName(payloadName, email) {
    const candidate = payloadName?.trim();
    if (candidate) {
        return candidate;
    }
    return email.split("@")[0] || "google-user";
}
export async function logInWithGoogle(body, options) {
    const idToken = body.idToken?.trim() ?? "";
    if (!idToken) {
        return { ok: false, status: 400, error: "idToken required" };
    }
    const oauthClient = new OAuth2Client(getGoogleClientId());
    let ticket;
    try {
        ticket = await oauthClient.verifyIdToken({
            idToken,
            audience: getGoogleClientId(),
        });
    }
    catch {
        return {
            ok: false,
            status: 401,
            error: "google token is invalid",
        };
    }
    const payload = ticket.getPayload();
    const googleSub = payload?.sub?.trim() ?? "";
    const email = payload?.email?.trim().toLowerCase() ?? "";
    if (!googleSub || !email) {
        return {
            ok: false,
            status: 401,
            error: "google token is invalid",
        };
    }
    const guestUserId = Number.isInteger(options?.guestUserId) && (options?.guestUserId ?? 0) > 0
        ? Number(options?.guestUserId)
        : null;
    const existingBySub = await authRepository.selectAuthByGoogleSub(googleSub);
    if (existingBySub) {
        if (existingBySub.deletedAt) {
            return { ok: false, status: 403, error: "account deleted" };
        }
        if (guestUserId && guestUserId !== existingBySub.id) {
            await mergeGuestIntoUser(guestUserId, existingBySub.id);
        }
        return { ok: true, ...createAuthResult(existingBySub, { isNewUser: false }) };
    }
    if (guestUserId) {
        const converted = await convertGuestWithGoogle({
            guestUserId,
            googleSub,
            email,
            userName: deriveUserName(payload?.name, email),
        });
        if (converted.ok === false) {
            return {
                ok: false,
                status: converted.status,
                error: converted.error,
            };
        }
        return {
            ok: true,
            ...createAuthResult(converted.row, { isNewUser: true }),
        };
    }
    const { row, isNewUser } = await authRepository.upsertGoogleAuth({
        googleSub,
        email,
        userName: deriveUserName(payload?.name, email),
    });
    if (isNewUser) {
        await grantSignupBonusTokens(row.id);
        await subscriptionRepository.ensureDefaultBasicSubscription(row.id);
    }
    return { ok: true, ...createAuthResult(row, { isNewUser }) };
}
export async function restoreDeletedAccount(body) {
    const idToken = body.idToken?.trim() ?? "";
    if (idToken) {
        const oauthClient = new OAuth2Client(getGoogleClientId());
        let ticket;
        try {
            ticket = await oauthClient.verifyIdToken({
                idToken,
                audience: getGoogleClientId(),
            });
        }
        catch {
            return {
                ok: false,
                status: 401,
                error: "google token is invalid",
            };
        }
        const payload = ticket.getPayload();
        const googleSub = payload?.sub?.trim() ?? "";
        if (!googleSub) {
            return {
                ok: false,
                status: 401,
                error: "google token is invalid",
            };
        }
        const row = await authRepository.selectAuthByGoogleSub(googleSub);
        if (!row?.deletedAt) {
            return {
                ok: false,
                status: 400,
                error: "account is not deleted",
            };
        }
        const restored = await userRepository.restoreSoftDeletedUser(row.id);
        if (!restored) {
            return {
                ok: false,
                status: 400,
                error: "account cannot be restored",
            };
        }
        const authRow = await authRepository.selectAuthByUserId(row.id);
        if (!authRow || authRow.deletedAt) {
            return {
                ok: false,
                status: 500,
                error: "restore failed",
            };
        }
        return { ok: true, ...createAuthResult(authRow) };
    }
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    if (!email || !password) {
        return {
            ok: false,
            status: 400,
            error: "email, password required",
        };
    }
    if (!EMAIL_REGEX.test(email)) {
        return { ok: false, status: 400, error: "invalid email" };
    }
    const row = await authRepository.selectAuthByEmail(email);
    if (!row?.passwordHash) {
        return { ok: false, status: 401, error: "invalid credentials" };
    }
    const isValid = await bcrypt.compare(password, row.passwordHash);
    if (!isValid) {
        return { ok: false, status: 401, error: "invalid credentials" };
    }
    if (!row.deletedAt) {
        return {
            ok: false,
            status: 400,
            error: "account is not deleted",
        };
    }
    const restored = await userRepository.restoreSoftDeletedUser(row.id);
    if (!restored) {
        return {
            ok: false,
            status: 400,
            error: "account cannot be restored",
        };
    }
    const authRow = await authRepository.selectAuthByUserId(row.id);
    if (!authRow || authRow.deletedAt) {
        return {
            ok: false,
            status: 500,
            error: "restore failed",
        };
    }
    return { ok: true, ...createAuthResult(authRow) };
}
export async function refreshSession(refreshToken) {
    if (!refreshToken) {
        return { ok: false, status: 401, error: "refresh token required" };
    }
    try {
        const payload = jwt.verify(refreshToken, getRefreshJwtSecret());
        if (payload.type !== "refresh") {
            return {
                ok: false,
                status: 401,
                error: "invalid refresh token",
            };
        }
        const userId = Number(payload.sub);
        if (!Number.isInteger(userId) || userId < 1) {
            return {
                ok: false,
                status: 401,
                error: "invalid refresh token",
            };
        }
        const authRow = await authRepository.selectAuthByUserId(userId);
        if (!authRow || authRow.deletedAt) {
            return {
                ok: false,
                status: 401,
                error: "invalid refresh token",
            };
        }
        return { ok: true, ...createAuthResult(userAuthRowToAuthUser(authRow)) };
    }
    catch {
        return { ok: false, status: 401, error: "invalid refresh token" };
    }
}
export async function getCurrentUser(userId) {
    if (!Number.isInteger(userId) || userId < 1) {
        return { ok: false, status: 401, error: "unauthorized" };
    }
    const authRow = await authRepository.selectAuthByUserId(userId);
    if (!authRow || authRow.deletedAt) {
        return { ok: false, status: 401, error: "unauthorized" };
    }
    return { ok: true, currentUser: createAuthResponse(userAuthRowToAuthUser(authRow)) };
}
export async function forgotPassword(body) {
    const email = body.email?.trim().toLowerCase() ?? "";
    if (!email || !EMAIL_REGEX.test(email)) {
        return { ok: true, resetToken: undefined };
    }
    const row = await authRepository.selectAuthByEmail(email);
    if (!row || row.deletedAt) {
        return { ok: true, resetToken: undefined };
    }
    if (!row.passwordHash) {
        return { ok: true, resetToken: undefined };
    }
    const resetToken = jwt.sign({ sub: row.id, type: "password_reset" }, getPasswordResetSecret(), { expiresIn: PASSWORD_RESET_EXPIRES_IN });
    if (isPostmarkConfigured()) {
        const appBase = resolveAuthEmailAppBase(body.appBaseUrl?.trim());
        if (!appBase) {
            console.error("[auth] Postmark is configured but no app base URL (set AUTH_PUBLIC_APP_URL or pass appBaseUrl from the client); cannot send reset email");
            return { ok: true, resetToken: undefined };
        }
        const resetUrl = `${appBase}/login?resetToken=${encodeURIComponent(resetToken)}`;
        try {
            await sendPasswordResetEmail({
                to: email,
                resetUrl,
                userName: row.userName,
            });
        }
        catch (error) {
            console.error("[auth] Failed to send password reset email", { email, error });
        }
        return { ok: true, resetToken: undefined };
    }
    if (process.env.NODE_ENV !== "production") {
        console.info("[auth] Password reset token generated", {
            email,
            resetToken,
        });
        return { ok: true, resetToken };
    }
    return { ok: true, resetToken: undefined };
}
export async function resetPassword(body) {
    const token = body.token?.trim() ?? "";
    const newPassword = body.newPassword ?? "";
    if (!token || !newPassword) {
        return {
            ok: false,
            status: 400,
            error: "token and newPassword required",
        };
    }
    if (newPassword.length < PASSWORD_MIN_LENGTH) {
        return {
            ok: false,
            status: 400,
            error: `password must be at least ${PASSWORD_MIN_LENGTH} characters`,
        };
    }
    let payload;
    try {
        payload = jwt.verify(token, getPasswordResetSecret());
    }
    catch {
        return { ok: false, status: 401, error: "invalid or expired reset token" };
    }
    if (payload.type !== "password_reset") {
        return { ok: false, status: 401, error: "invalid or expired reset token" };
    }
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId < 1) {
        return { ok: false, status: 401, error: "invalid or expired reset token" };
    }
    const user = await userRepository.selectUserById(userId);
    if (!user) {
        return { ok: false, status: 401, error: "invalid or expired reset token" };
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await authRepository.upsertPasswordHashByUserId(userId, passwordHash);
    return { ok: true };
}
export async function verifyEmailWithToken(body) {
    const token = body.token?.trim() ?? "";
    if (!token) {
        console.error("[auth] !token", { body });
        return { ok: false, status: 400, error: "token required" };
    }
    let payload;
    try {
        payload = jwt.verify(token, getJwtSecret());
    }
    catch {
        return {
            ok: false,
            status: 401,
            error: "invalid or expired verification token",
        };
    }
    if (payload.type !== "email_verify") {
        return {
            ok: false,
            status: 401,
            error: "invalid or expired verification token",
        };
    }
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId < 1) {
        return {
            ok: false,
            status: 401,
            error: "invalid or expired verification token",
        };
    }
    const updated = await authRepository.markUserEmailVerified(userId);
    if (!updated) {
        return {
            ok: false,
            status: 401,
            error: "invalid or expired verification token",
        };
    }
    return { ok: true };
}
export async function resendVerificationEmail(userId, body) {
    if (!Number.isInteger(userId) || userId < 1) {
        return { ok: false, status: 401, error: "unauthorized" };
    }
    const row = await authRepository.selectAuthByUserId(userId);
    if (!row || row.deletedAt) {
        return { ok: false, status: 401, error: "unauthorized" };
    }
    if (row.emailVerifiedAt) {
        return { ok: false, status: 400, error: "email already verified" };
    }
    const appBase = resolveAuthEmailAppBase(body.appBaseUrl?.trim());
    if (!appBase) {
        return {
            ok: false,
            status: 503,
            error: "email link base URL not configured",
        };
    }
    const verifyToken = jwt.sign({ sub: row.id, type: "email_verify" }, getJwtSecret(), { expiresIn: EMAIL_VERIFY_EXPIRES_IN });
    const verifyUrl = `${appBase}/login?verifyToken=${encodeURIComponent(verifyToken)}`;
    if (isPostmarkConfigured() && row.email) {
        try {
            await sendEmailVerificationEmail({
                to: row.email,
                verifyUrl,
                userName: row.userName,
            });
        }
        catch (error) {
            console.error("[auth] Failed to resend verification email", {
                email: row.email,
                error,
            });
            return {
                ok: false,
                status: 502,
                error: "failed to send verification email",
            };
        }
        return { ok: true };
    }
    if (process.env.NODE_ENV !== "production") {
        console.info("[auth] Email verification token resent (dev)", {
            email: row.email,
            verifyToken,
        });
        return { ok: true };
    }
    return { ok: false, status: 503, error: "email delivery unavailable" };
}
