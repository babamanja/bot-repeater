import { getPrisma } from "../db/prisma.js";

/** Promote users listed in ADMIN_EMAILS / ADMIN_TELEGRAM_IDS to admin on startup. */
export async function bootstrapAdminRoles(): Promise<void> {
  const prisma = getPrisma();

  const emailRaw = process.env.ADMIN_EMAILS?.trim();
  if (emailRaw) {
    const emails = [
      ...new Set(
        emailRaw
          .split(",")
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];
    if (emails.length > 0) {
      const result = await prisma.user.updateMany({
        where: {
          email: { in: emails },
          deletedAt: null,
          role: { not: "admin" },
        },
        data: { role: "admin" },
      });
      if (result.count > 0) {
        console.log(`[admin] Promoted ${result.count} user(s) to admin (ADMIN_EMAILS)`);
      }
    }
  }

  const tgRaw = process.env.ADMIN_TELEGRAM_IDS?.trim();
  if (tgRaw) {
    const ids = [
      ...new Set(
        tgRaw
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
          .map((id) => {
            try {
              return BigInt(id);
            } catch {
              return null;
            }
          })
          .filter((id): id is bigint => id != null),
      ),
    ];
    if (ids.length > 0) {
      const result = await prisma.user.updateMany({
        where: {
          telegramId: { in: ids },
          deletedAt: null,
          role: { not: "admin" },
        },
        data: { role: "admin" },
      });
      if (result.count > 0) {
        console.log(`[admin] Promoted ${result.count} user(s) to admin (ADMIN_TELEGRAM_IDS)`);
      }
    }
  }
}
