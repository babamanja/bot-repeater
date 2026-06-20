/** Telegram user ids and ms timestamps fit in Number; Prisma uses bigint for TelegramUser.id. */
export function toBigInt(value) {
    return BigInt(String(value));
}
