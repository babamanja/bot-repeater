export function requireInternalApiKey(req, res, next) {
    const expected = process.env.INTERNAL_API_KEY?.trim();
    if (!expected) {
        res.status(503).json({ error: "internal api disabled" });
        return;
    }
    const provided = req.header("x-internal-api-key")?.trim();
    if (!provided || provided !== expected) {
        res.status(401).json({ error: "unauthorized" });
        return;
    }
    next();
}
