import type { Context } from 'telegraf';
import type { PrismaClient } from '../../../prisma/src/generated/prisma';
import {
  addLanguageByName,
  getAllLanguages,
  LanguageNotFoundError,
  setUserLanguage,
} from '../../domain/vocab';
import { getUserLanguages } from '../../domain/telegram-user';
import { mainReplyKeyboard } from '../user/telegram-ui';
import type { ActionContext } from '../telegraf-helpers';
import { getMessageText } from '../telegraf-helpers';
import { botT } from '../../i18n';

export async function showLangSelect(
  ctx: Context,
  pool: PrismaClient,
  langKey: 'select_primary_lang' | 'select_learning_lang',
  callbackPrefix: 'set_primary_' | 'set_learning_',
): Promise<void> {
  const langs = await getAllLanguages(pool);
  if (!langs.length) {
    await ctx.editMessageText(botT(ctx, 'no_langs'));
    return;
  }

  await ctx.editMessageText(botT(ctx, langKey), {
    reply_markup: {
      inline_keyboard: langs.map((l) => [
        { text: l.name, callback_data: `${callbackPrefix}${l.id}` },
      ]),
    },
  });
}

/** Handles `callback_data` like `set_primary_1` / `set_learning_2` (one regex in commands). */
export async function handleSetLanguageAction(ctx: ActionContext, pool: PrismaClient): Promise<void> {
  const kind = ctx.match?.[1] as 'primary' | 'learning' | undefined;
  const langId = Number(ctx.match?.[2]);
  const telegramUserId = ctx?.from?.id;
  if (!telegramUserId) {
    await ctx.answerCbQuery();
    return;
  }
  if (!kind || !Number.isInteger(langId)) {
    await ctx.answerCbQuery(botT(ctx, 'callback_invalid_id'));
    return;
  }
  try {
    await setUserLanguage(pool, telegramUserId, langId, kind);
  } catch (e) {
    if (e instanceof LanguageNotFoundError) {
      await ctx.answerCbQuery(botT(ctx, 'setlangs_missing_langs', { missing: e.missingLangIds.join(', ') }));
      return;
    }
    throw e;
  }

  await ctx.answerCbQuery();

  if (kind === 'primary') {
    const { learningLangId } = await getUserLanguages(pool, telegramUserId);
    if (learningLangId == null) {
      await showLangSelect(ctx, pool, 'select_learning_lang', 'set_learning_');
    } else {
      await ctx.editMessageText(botT(ctx, 'start'));
      await ctx.reply(botT(ctx, 'keyboard_hint'), {
        reply_markup: mainReplyKeyboard(ctx),
      });
    }
    return;
  }

  await ctx.editMessageText(botT(ctx, 'start'));
  await ctx.reply(botT(ctx, 'keyboard_hint'), {
    reply_markup: mainReplyKeyboard(ctx),
  });
}

function getRest(text: string): string {
  return text.replace(/^\/\w+(?:@\w+)?/i, '').trim();
}

export async function handleAddLangCommand(ctx: Context, pool: PrismaClient): Promise<void> {
  const text = getMessageText(ctx) ?? '';
  const rest = getRest(text);

  if (!rest) {
    await ctx.reply(botT(ctx, 'addlang_format'));
    return;
  }

  const langId = await addLanguageByName(pool, rest);
  await ctx.reply(botT(ctx, 'addlang_success', { langId, langName: rest }));
}
