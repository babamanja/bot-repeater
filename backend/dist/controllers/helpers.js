export function getRequiredUserId(req) {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId < 1) {
        return null;
    }
    return userId;
}
export function getUserRole(req) {
    return typeof req.user?.role === "string" ? req.user.role : "user";
}
export function sendUnauthorized(res) {
    return res.status(401).json({ error: "unauthorized" });
}
export function sendServiceFailure(res, result, extra) {
    return res.status(result.status).json({ error: result.error, ...extra });
}
