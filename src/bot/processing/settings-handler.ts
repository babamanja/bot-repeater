import type { Context } from 'telegraf';
import type { PrismaClient } from '../../../prisma/src/generated/prisma';
import { showLangSelect } from '../language/handler';
import { clearAddWordFlow } from '../word/add-word-flow-state';
import { botT } from '../../i18n';

export async function handleSettingsReply(ctx: Context): Promise<void> {
  if (ctx.from?.id) clearAddWordFlow(ctx.from.id);

  await ctx.reply(botT(ctx, 'settings_menu_title'), {
    reply_markup: {
      inline_keyboard: [
        [{ text: botT(ctx, 'btn_settings_change_primary'), callback_data: 'settings_change_primary' }],
        [{ text: botT(ctx, 'btn_settings_change_learning'), callback_data: 'settings_change_learning' }],
        [{ text: botT(ctx, 'btn_settings_back'), callback_data: 'settings_back' }],
      ],
    },
  });
}

export async function handleSettingsMenuCallback(ctx: Context, pool: PrismaClient): Promise<void> {
  const data = (ctx.callbackQuery as { data?: string }).data;

  switch (data) {
    case 'settings_change_primary':
      await ctx.answerCbQuery();
      await showLangSelect(ctx, pool, 'select_primary_lang', 'set_primary_');
      return;
    case 'settings_change_learning':
      await ctx.answerCbQuery();
      await showLangSelect(ctx, pool, 'select_learning_lang', 'set_learning_');
      return;
    case 'settings_back':
      await ctx.answerCbQuery();
      try {
        await ctx.deleteMessage();
      } catch {
        await ctx.editMessageText(botT(ctx, 'settings_back_closed'));
      }
      return;
    default:
      return;
  }
}
