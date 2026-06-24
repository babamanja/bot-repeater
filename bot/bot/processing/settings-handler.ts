import type { Context } from 'telegraf';
import type { PrismaClient } from '@prisma/client';
import { showLangSelect } from '../language/handler';
import { clearAddWordFlow } from '../word/add-word-flow-state';
import { botT } from '../../i18n';
import { getUserIdByTelegram, isTelegramOnlyAccount } from '../../domain/telegram-user';
import { createTelegramLinkCodeForBotUser } from '../../domain/telegram-link-api';

export async function handleSettingsReply(ctx: Context, prisma: PrismaClient): Promise<void> {
  if (!ctx.from?.id) {
    return;
  }
  clearAddWordFlow(ctx.from.id);

  const userId = await getUserIdByTelegram(prisma, ctx.from.id);
  const showLinkWeb = userId != null && (await isTelegramOnlyAccount(prisma, userId));

  const rows: Array<Array<{ text: string; callback_data: string }>> = [
    [{ text: botT(ctx, 'btn_settings_change_primary'), callback_data: 'settings_change_primary' }],
    [{ text: botT(ctx, 'btn_settings_change_learning'), callback_data: 'settings_change_learning' }],
  ];
  if (showLinkWeb) {
    rows.push([{ text: botT(ctx, 'btn_settings_link_web'), callback_data: 'settings_link_web' }]);
  }
  rows.push([{ text: botT(ctx, 'btn_settings_back'), callback_data: 'settings_back' }]);

  await ctx.reply(botT(ctx, 'settings_menu_title'), {
    reply_markup: {
      inline_keyboard: rows,
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
    case 'settings_link_web':
      await ctx.answerCbQuery();
      await handleLinkWebAccount(ctx, pool);
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

async function handleLinkWebAccount(ctx: Context, prisma: PrismaClient): Promise<void> {
  const telegramUserId = ctx.from?.id;
  if (!telegramUserId) {
    return;
  }

  const userId = await getUserIdByTelegram(prisma, telegramUserId);
  if (userId == null) {
    await ctx.reply(botT(ctx, 'link_web_user_missing'));
    return;
  }

  try {
    const result = await createTelegramLinkCodeForBotUser(userId);
    const profileUrl = result.profileUrl ?? 'your website profile';
    await ctx.reply(
      botT(ctx, 'link_web_code_ready', {
        code: result.code,
        profileUrl,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    await ctx.reply(botT(ctx, 'link_web_failed', { error: message }));
  }
}
