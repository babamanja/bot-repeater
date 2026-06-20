import * as telegramService from "../services/telegram.service.js";
export async function ensureTelegramUser(req, res) {
    const telegramIdRaw = req.body?.telegramId;
    const userName = typeof req.body?.userName === "string" ? req.body.userName.trim() : "";
    const telegramUsername = typeof req.body?.telegramUsername === "string" ? req.body.telegramUsername.trim() : null;
    let telegramId;
    try {
        telegramId = BigInt(String(telegramIdRaw));
    }
    catch {
        return res.status(400).json({ error: "invalid telegramId" });
    }
    if (!userName) {
        return res.status(400).json({ error: "userName is required" });
    }
    const result = await telegramService.ensureTelegramUser({
        telegramId,
        userName,
        telegramUsername,
    });
    return res.status(200).json(result);
}
export async function recordTelegramStarsPayment(req, res) {
    const userId = Number(req.body?.userId);
    const amount = Number(req.body?.amount);
    const currency = typeof req.body?.currency === "string" ? req.body.currency : "XTR";
    const providerTransactionId = typeof req.body?.providerTransactionId === "string"
        ? req.body.providerTransactionId.trim()
        : "";
    const billingPeriod = req.body?.billingPeriod === "yearly" ? "yearly" : "monthly";
    if (!Number.isInteger(userId) || userId < 1) {
        return res.status(400).json({ error: "invalid userId" });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ error: "invalid amount" });
    }
    if (!providerTransactionId) {
        return res.status(400).json({ error: "providerTransactionId is required" });
    }
    await telegramService.recordTelegramStarsPayment({
        userId,
        amount,
        currency,
        providerTransactionId,
        billingPeriod,
    });
    return res.status(200).json({ ok: true });
}
