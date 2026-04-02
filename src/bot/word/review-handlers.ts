import type { Context } from 'telegraf';
import type { PrismaClient } from '../../../prisma/src/generated/prisma';
import {
  applyReviewResult,
  getRandomDueWordsForUser,
  type DueVocabPair,
  UserLanguagesNotSetError,
} from '../../domain/vocab';
import {
  advanceAfterCardAnswer,
  clearReviewSession,
  getReviewSession,
  putReviewSession,
  REVIEW_BATCH_SIZE,
  validateCurrentCard,
} from './review-session-state';
import { clearAddWordFlow } from './add-word-flow-state';
import { escapeHtmlText, type ActionContext } from '../telegraf-helpers';
import { requireUserLanguagesSetOrReply } from '../user/telegram-ui';
import { botT } from '../../i18n';

async function sendReviewCard(ctx: Context, word: DueVocabPair, nonce: string): Promise<void> {
  const learning = escapeHtmlText(word.learningWord);
  const primary = escapeHtmlText(word.primaryWord);
  const body = `${learning}\n<tg-spoiler>${primary}</tg-spoiler>`;

  await ctx.reply(body, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: botT(ctx, 'btn_know'), callback_data: `know_${word.pairId}_${nonce}` },
          { text: botT(ctx, 'btn_dont'), callback_data: `dont_${word.pairId}_${nonce}` },
        ],
      ],
    },
  });
}

export async function runVocabReview(ctx: Context, pool: PrismaClient): Promise<void> {
  if (!ctx.from?.id) return;
  clearAddWordFlow(ctx.from.id);

  if (!(await requireUserLanguagesSetOrReply(ctx, pool))) return;

  let words: DueVocabPair[];
  try {
    words = await getRandomDueWordsForUser(pool, ctx.from.id, Date.now(), REVIEW_BATCH_SIZE);
  } catch (e) {
    if (e instanceof UserLanguagesNotSetError) {
      await ctx.reply(botT(ctx, 'missing_langs'));
      return;
    }
    throw e;
  }

  if (words.length === 0) {
    await ctx.reply(botT(ctx, 'review_no_words'));
    return;
  }

  const nonce = putReviewSession(ctx.from.id, words);
  if (!nonce) return;

  await sendReviewCard(ctx, words[0], nonce);
}

async function handleReviewGrade(
  ctx: ActionContext,
  pool: PrismaClient,
  result: 'know' | 'dont',
): Promise<void> {
  const uid = ctx.from?.id;
  if (!uid) return;

  const pairId = Number(ctx.match?.[1]);
  const nonce = ctx.match?.[2];
  if (!Number.isFinite(pairId) || !nonce) {
    await ctx.answerCbQuery(botT(ctx, 'callback_invalid_id'));
    return;
  }

  const sessionBefore = getReviewSession(uid);
  const batchSize = sessionBefore?.queue.length ?? 0;

  if (!validateCurrentCard(uid, pairId, nonce)) {
    await ctx.answerCbQuery(botT(ctx, 'callback_invalid_id'));
    return;
  }

  try {
    const { learningWord, primaryWord } = await applyReviewResult(pool, uid, pairId, result, Date.now());
    await ctx.answerCbQuery();
    await ctx.editMessageText(botT(ctx, 'callback_review_reveal', { learningWord, primaryWord }));

    const next = advanceAfterCardAnswer(uid);
    if (next) {
      await sendReviewCard(ctx, next.word, next.nonce);
    } else {
      await ctx.reply(botT(ctx, 'review_session_complete', { count: String(batchSize) }), {
        reply_markup: {
          inline_keyboard: [
            [
              { text: botT(ctx, 'btn_review_give_more'), callback_data: 'review_more' },
              { text: botT(ctx, 'btn_review_cancel'), callback_data: 'review_cancel' },
            ],
          ],
        },
      });
    }
  } catch {
    await ctx.answerCbQuery(botT(ctx, 'callback_word_not_found'));
  }
}

export async function handleReviewKnowCallback(ctx: ActionContext, pool: PrismaClient): Promise<void> {
  await handleReviewGrade(ctx, pool, 'know');
}

export async function handleReviewDontCallback(ctx: ActionContext, pool: PrismaClient): Promise<void> {
  await handleReviewGrade(ctx, pool, 'dont');
}

export async function handleReviewMoreCallback(ctx: ActionContext, pool: PrismaClient): Promise<void> {
  await ctx.answerCbQuery();
  await runVocabReview(ctx, pool);
}

export async function handleReviewCancelCallback(ctx: ActionContext): Promise<void> {
  if (ctx.from?.id) clearReviewSession(ctx.from.id);
  await ctx.answerCbQuery();
  await ctx.reply(botT(ctx, 'review_cancelled'));
}
