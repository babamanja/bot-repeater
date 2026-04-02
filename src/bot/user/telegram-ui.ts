import { Markup } from 'telegraf';
import type { PrismaClient } from '../../../prisma/src/generated/prisma';
import { getUserLanguages } from '../../domain/telegram-user';
import { botT } from '../../i18n';

export async function requireUserLanguagesSetOrReply(ctx: any, prisma: PrismaClient): Promise<boolean> {
  const telegramUserId = ctx?.from?.id;
  if (!telegramUserId) return false;

  const { primaryLangId, learningLangId } = await getUserLanguages(prisma, telegramUserId);
  if (primaryLangId == null || learningLangId == null) {
    await ctx.reply(botT(ctx, 'missing_langs'));
    return false;
  }

  return true;
}

/** Persistent bottom reply keyboard (Telegram: is_persistent). */
export function mainReplyKeyboard(ctx: unknown) {
  return Markup.keyboard([
    [
      { text: botT(ctx, 'btn_add_words') },
      { text: botT(ctx, 'btn_repeat_words') },
      { text: botT(ctx, 'btn_settings') },
    ],
  ])
    .resize()
    .persistent()
    .reply_markup;
}
