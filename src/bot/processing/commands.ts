import { Telegraf } from 'telegraf';
import type { PrismaClient } from '../../../prisma/src/generated/prisma';
import {
  handleAddWordFlowText,
  handleAddWordPickCallback,
  startAddWordDialog,
} from '../word/add-word-flow-handlers';
import {
  handleReviewCancelCallback,
  handleReviewDontCallback,
  handleReviewKnowCallback,
  handleReviewMoreCallback,
  runVocabReview,
} from '../word/review-handlers';
import { handleSettingsMenuCallback, handleSettingsReply } from './settings-handler';
import {
  ADD_WORDS_BUTTON_LABELS,
  REPEAT_WORDS_BUTTON_LABELS,
  SETTINGS_BUTTON_LABELS,
} from '../../i18n';

export function registerProcessingCommands(bot: Telegraf, pool: PrismaClient): void {
  bot.hears([...ADD_WORDS_BUTTON_LABELS], (ctx) => startAddWordDialog(ctx, pool));

  bot.action(/^add_pick_(\d+)$/, (ctx) => handleAddWordPickCallback(ctx, pool));

  bot.hears([...SETTINGS_BUTTON_LABELS], (ctx) => handleSettingsReply(ctx));

  bot.action(/^settings_(change_primary|change_learning|back)$/, (ctx) =>
    handleSettingsMenuCallback(ctx, pool),
  );

  bot.command('review', (ctx) => runVocabReview(ctx, pool));

  bot.hears([...REPEAT_WORDS_BUTTON_LABELS], (ctx) => runVocabReview(ctx, pool));

  bot.action(/^know_(\d+)_([a-f0-9]+)$/, (ctx) => handleReviewKnowCallback(ctx, pool));

  bot.action(/^dont_(\d+)_([a-f0-9]+)$/, (ctx) => handleReviewDontCallback(ctx, pool));

  bot.action(/^review_more$/, (ctx) => handleReviewMoreCallback(ctx, pool));

  bot.action(/^review_cancel$/, (ctx) => handleReviewCancelCallback(ctx));

  bot.on('text', (ctx) => handleAddWordFlowText(ctx, pool));
}
