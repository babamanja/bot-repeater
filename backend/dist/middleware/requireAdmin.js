import { requireAuth } from "./requireAuth.js";
export async function requireAdmin(req, res, next) {
    return requireAuth(req, res, () => {
        if (req.user?.role !== "admin") {
            return res.status(403).json({ error: "forbidden" });
        }
        return next();
    });
}
