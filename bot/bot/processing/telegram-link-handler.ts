import type { Context } from 'telegraf';
import { botT } from '../../i18n';
import {
  completeTelegramLinkFromBot,
  type LanguageChoiceOption,
} from '../../domain/telegram-link-api';
import type { TelegramProfile } from '../../domain/telegram-user';

function profileFromCtx(ctx: Context): TelegramProfile | null {
  if (!ctx.from?.id) {
    return null;
  }
  return {
    id: ctx.from.id,
    username: ctx.from.username,
    firstName: ctx.from.first_name,
    lastName: ctx.from.last_name,
  };
}

function formatLanguageOption(ctx: Context, option: LanguageChoiceOption): string {
  const key = option.source === 'web' ? 'merge_lang_option_web' : 'merge_lang_option_telegram';
  return botT(ctx, key, {
    primary: option.primaryLanguageName,
    learning: option.learningLanguageName,
  });
}

export async function promptLanguageChoice(
  ctx: Context,
  code: string,
  options: LanguageChoiceOption[],
): Promise<void> {
  const keyboard = options.map((option) => [
    {
      text: formatLanguageOption(ctx, option),
      callback_data: `merge_lang_${option.source}_${code}`,
    },
  ]);

  await ctx.reply(botT(ctx, 'merge_lang_prompt'), {
    reply_markup: { inline_keyboard: keyboard },
  });
}

export async function handleTelegramLinkStart(
  ctx: Context,
  code: string,
): Promise<boolean> {
  const profile = profileFromCtx(ctx);
  if (!profile) {
    return false;
  }

  const linked = await completeTelegramLinkFromBot({ profile, code });
  if (linked.ok) {
    await ctx.reply(botT(ctx, 'link_success'));
    return true;
  }
  if ('needsLanguageChoice' in linked && linked.needsLanguageChoice) {
    await promptLanguageChoice(ctx, code, linked.languageOptions);
    return true;
  }
  const errorMessage = 'error' in linked ? linked.error : 'link failed';
  await ctx.reply(botT(ctx, 'link_failed', { error: errorMessage }));
  return true;
}

export async function handleMergeLanguageCallback(
  ctx: Context,
  source: 'web' | 'telegram',
  code: string,
): Promise<void> {
  const profile = profileFromCtx(ctx);
  if (!profile) {
    return;
  }

  await ctx.answerCbQuery();
  const linked = await completeTelegramLinkFromBot({
    profile,
    code,
    languageSource: source,
  });
  if (linked.ok) {
    await ctx.reply(botT(ctx, 'link_success'));
    return;
  }
  const errorMessage = 'error' in linked ? linked.error : 'link failed';
  await ctx.reply(botT(ctx, 'link_failed', { error: errorMessage }));
}
