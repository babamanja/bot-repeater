export const errorHandler = (err, _req, res, next) => {
    console.error("[api] Unhandled error:", err);
    if (res.headersSent) {
        next(err);
        return;
    }
    res.status(500).json({ error: "internal_error" });
};
