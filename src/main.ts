import { Telegraf } from 'telegraf';
import { registerLanguageCommands } from './bot/language/commands';
import { registerProcessingCommands } from './bot/processing/commands';
import { createPrismaClient } from './domain/prisma-client';
import { getUserLanguages } from './domain/telegram-user';
import { getAllLanguages, initVocabSchema } from './domain/vocab';
import { botT } from './i18n';
import { mainReplyKeyboard } from './bot/user/telegram-ui';
import config from './config';


async function bootstrap() {
  const botToken = config.botToken;
  const bot = new Telegraf(botToken);

  const pool = createPrismaClient(config.databaseUrl);
  await initVocabSchema(pool);

  bot.start(async (ctx) => {
    if (!ctx.from?.id) return;

    const { primaryLangId, learningLangId } = await getUserLanguages(pool, ctx.from.id);

    if (primaryLangId == null) {
      const langs = await getAllLanguages(pool);
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
      const langs = await getAllLanguages(pool);
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

  // registerUserCommands(bot, pool);
  registerLanguageCommands(bot, pool);
  registerProcessingCommands(bot, pool);

  await bot.launch();
}
bootstrap();