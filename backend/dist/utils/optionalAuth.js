import jwt from "jsonwebtoken";
function getJwtSecret() {
    const secret = process.env.AUTH_JWT_SECRET?.trim();
    if (!secret) {
        throw new Error("AUTH_JWT_SECRET is required");
    }
    return secret;
}
export function extractAccessToken(req) {
    const header = req.headers?.authorization;
    const value = Array.isArray(header) ? header[0] : header;
    if (typeof value !== "string" || !value.startsWith("Bearer ")) {
        return null;
    }
    const token = value.slice("Bearer ".length).trim();
    return token.length > 0 ? token : null;
}
export function decodeAccessUserId(token) {
    try {
        const payload = jwt.verify(token, getJwtSecret());
        if (payload.type !== "access") {
            return null;
        }
        const userId = Number(payload.sub);
        if (!Number.isInteger(userId) || userId < 1) {
            return null;
        }
        return userId;
    }
    catch {
        return null;
    }
}
export function resolveOptionalAccessUserId(req) {
    const token = extractAccessToken(req);
    if (!token) {
        return null;
    }
    return decodeAccessUserId(token);
}
