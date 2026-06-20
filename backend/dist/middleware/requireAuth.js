import jwt from "jsonwebtoken";
import * as userRepository from "../db/userRepository.js";
function getJwtSecret() {
    const secret = process.env.AUTH_JWT_SECRET?.trim();
    if (!secret) {
        throw new Error("AUTH_JWT_SECRET is required");
    }
    return secret;
}
function extractBearerToken(headerValue) {
    if (typeof headerValue !== "string") {
        return "";
    }
    const [scheme, token] = headerValue.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token) {
        return "";
    }
    return token.trim();
}
export async function requireAuth(req, res, next) {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
        return res.status(401).json({ error: "unauthorized" });
    }
    try {
        const payload = jwt.verify(token, getJwtSecret());
        if (payload.type !== undefined && payload.type !== "access") {
            return res.status(401).json({ error: "unauthorized" });
        }
        const userId = Number(payload.sub);
        if (!Number.isInteger(userId) || userId < 1) {
            return res.status(401).json({ error: "unauthorized" });
        }
        const user = await userRepository.selectUserById(userId);
        if (!user) {
            return res.status(401).json({ error: "unauthorized" });
        }
        req.user = { id: user.id, role: user.role };
        return next();
    }
    catch {
        return res.status(401).json({ error: "unauthorized" });
    }
}
