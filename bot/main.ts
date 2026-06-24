import { Telegraf } from 'telegraf';
import { registerLanguageCommands } from './bot/language/commands';
import { registerProcessingCommands } from './bot/processing/commands';
import { registerSubscriptionCommands } from './bot/subscription/commands';
import { createPrismaClient } from './domain/prisma-client';
import { ensureUserByTelegram, getUserLanguages } from './domain/telegram-user';
import { getAllLanguages, initVocabSchema } from './domain/vocab';
import { botT } from './i18n';
import { mainReplyKeyboard } from './bot/user/telegram-ui';
import { handleTelegramLinkStart } from './bot/processing/telegram-link-handler';
import config from './config';

async function bootstrap() {
  const bot = new Telegraf(config.botToken);
  const prisma = createPrismaClient(config.databaseUrl);
  await initVocabSchema(prisma);

  bot.start(async (ctx) => {
    if (!ctx.from?.id) return;

    const startPayload = ctx.startPayload?.trim();
    if (startPayload?.startsWith('link_')) {
      const code = startPayload.slice('link_'.length);
      await handleTelegramLinkStart(ctx, code);
      return;
    }

    await ensureUserByTelegram(prisma, {
      id: ctx.from.id,
      username: ctx.from.username,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name,
    });

    const { primaryLangId, learningLangId } = await getUserLanguages(prisma, ctx.from.id);

    if (primaryLangId == null) {
      const langs = await getAllLanguages(prisma);
      if (langs.length === 0) return ctx.reply(botT(ctx, 'no_langs'));
      return ctx.reply(botT(ctx, 'select_primary_lang'), {
        reply_markup: {
          inline_keyboard: langs.map((l) => [
            { text: l.name, callback_data: `set_primary_${l.id}` },
          ]),
        },
      });
    }

    if (learningLangId == null) {
      const langs = await getAllLanguages(prisma);
      if (langs.length === 0) return ctx.reply(botT(ctx, 'no_langs'));
      return ctx.reply(botT(ctx, 'select_learning_lang'), {
        reply_markup: {
          inline_keyboard: langs.map((l) => [
            { text: l.name, callback_data: `set_learning_${l.id}` },
          ]),
        },
      });
    }

    return ctx.reply(botT(ctx, 'start'), {
      reply_markup: mainReplyKeyboard(ctx),
    });
  });

  registerLanguageCommands(bot, prisma);
  registerProcessingCommands(bot, prisma);
  registerSubscriptionCommands(bot, prisma);

  bot.catch((error, ctx) => {
    console.error('[bot] handler error', error);
    void ctx.reply('Something went wrong. Please try again later.').catch(() => undefined);
  });

  await bot.launch();
  console.log('[bot] polling started');
}

bootstrap().catch((error) => {
  console.error('[bot] failed to start', error);
  process.exit(1);
});
