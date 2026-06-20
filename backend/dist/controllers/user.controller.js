import * as userService from "../services/user.service.js";
import { getRequiredUserId, sendServiceFailure, sendUnauthorized, } from "./helpers.js";
function extractRequestId(req) {
    const header = req.headers?.["x-request-id"];
    if (typeof header === "string" && header.trim()) {
        return header.trim();
    }
    if (Array.isArray(header) && header.length > 0 && typeof header[0] === "string") {
        const candidate = header[0].trim();
        return candidate || undefined;
    }
    return undefined;
}
export async function createUserDeprecated(_req, res) {
    return res.status(410).json({
        error: "POST /api/users is deprecated. Use authenticated endpoints GET /api/users/me and PATCH /api/users/me.",
    });
}
export async function getCurrentUser(req, res) {
    const userId = getRequiredUserId(req);
    if (userId === null) {
        return sendUnauthorized(res);
    }
    const result = await userService.getCurrentUser(userId);
    if (result.ok === false) {
        return sendServiceFailure(res, result);
    }
    return res.status(200).json(result.user);
}
export async function updateCurrentUser(req, res) {
    const userId = getRequiredUserId(req);
    if (userId === null) {
        return sendUnauthorized(res);
    }
    const result = await userService.updateCurrentUser(userId, req.body ?? {});
    if (result.ok === false) {
        return sendServiceFailure(res, result);
    }
    return res.status(200).json(result.user);
}
export async function getDashboardStats(req, res) {
    const userId = getRequiredUserId(req);
    if (userId === null) {
        return sendUnauthorized(res);
    }
    const result = await userService.getUserDashboardStats(userId);
    if (result.ok === false) {
        return sendServiceFailure(res, result);
    }
    return res.status(200).json(result.stats);
}
export async function deleteCurrentUser(req, res) {
    const userId = getRequiredUserId(req);
    if (userId === null) {
        return sendUnauthorized(res);
    }
    const result = await userService.deleteCurrentUser(userId, extractRequestId(req));
    if (result.ok === false) {
        return sendServiceFailure(res, result);
    }
    return res.status(204).send();
}
