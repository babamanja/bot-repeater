import { Telegraf } from 'telegraf';
import type { PrismaClient } from '@prisma/client';
import {
  handleAddWordFlowText,
  handleAddWordPickCallback,
  startAddWordDialog,
} from '../word/add-word-flow-handlers';
import {
  handleReviewCancelCallback,
  handleReviewCloseDontCallback,
  handleReviewCloseKnowCallback,
  handleReviewDontCallback,
  handleReviewFlowText,
  handleReviewMoreCallback,
  runVocabReview,
} from '../word/review-handlers';
import { handleSettingsMenuCallback, handleSettingsReply } from './settings-handler';
import { handleMergeLanguageCallback } from './telegram-link-handler';
import {
  ADD_WORDS_BUTTON_LABELS,
  REPEAT_WORDS_BUTTON_LABELS,
  SETTINGS_BUTTON_LABELS,
} from '../../i18n';

export function registerProcessingCommands(bot: Telegraf, pool: PrismaClient): void {
  bot.hears([...ADD_WORDS_BUTTON_LABELS], (ctx) => startAddWordDialog(ctx, pool));

  bot.action(/^add_pick_(\d+)$/, (ctx) => handleAddWordPickCallback(ctx, pool));

  bot.hears([...SETTINGS_BUTTON_LABELS], (ctx) => handleSettingsReply(ctx, pool));

  bot.action(/^settings_(change_primary|change_learning|link_web|back)$/, (ctx) =>
    handleSettingsMenuCallback(ctx, pool),
  );

  bot.action(/^merge_lang_(web|telegram)_([a-f0-9]+)$/i, (ctx) => {
    const source = ctx.match?.[1] as 'web' | 'telegram';
    const code = ctx.match?.[2] ?? '';
    return handleMergeLanguageCallback(ctx, source, code);
  });

  bot.command('review', (ctx) => runVocabReview(ctx, pool));

  bot.hears([...REPEAT_WORDS_BUTTON_LABELS], (ctx) => runVocabReview(ctx, pool));

  bot.action(/^dont_(\d+)_([a-f0-9]+)$/, (ctx) => handleReviewDontCallback(ctx, pool));

  bot.action(/^rknow_(\d+)_([a-f0-9]+)$/, (ctx) => handleReviewCloseKnowCallback(ctx, pool));

  bot.action(/^rdont_(\d+)_([a-f0-9]+)$/, (ctx) => handleReviewCloseDontCallback(ctx, pool));

  bot.action(/^review_more$/, (ctx) => handleReviewMoreCallback(ctx, pool));

  bot.action(/^review_cancel$/, (ctx) => handleReviewCancelCallback(ctx));

  bot.on('text', async (ctx) => {
    if (await handleReviewFlowText(ctx, pool)) return;
    await handleAddWordFlowText(ctx, pool);
  });
}
