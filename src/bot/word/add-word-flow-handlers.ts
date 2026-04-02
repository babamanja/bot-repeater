import type { Context } from 'telegraf';
import type { PrismaClient } from '../../../prisma/src/generated/prisma';
import {
  attachUserToVocabPair,
  createPairFromPrimaryWordAndLearningText,
  findExistingPairsForPrimaryWord,
  findOrCreateVocabWord,
  getUserLanguageNames,
} from '../../domain/vocab';
import {
  clearAddWordFlow,
  getAddWordFlowState,
  setAddWordFlowState,
} from './add-word-flow-state';
import type { ActionContext } from '../telegraf-helpers';
import { getMessageText } from '../telegraf-helpers';
import { getUserLanguages } from '../../domain/telegram-user';
import { requireUserLanguagesSetOrReply } from '../user/telegram-ui';
import { botT } from '../../i18n';

const BTN_LABEL_MAX = 48;

function truncateLabel(text: string): string {
  if (text.length <= BTN_LABEL_MAX) return text;
  return text.slice(0, BTN_LABEL_MAX - 1) + '…';
}

export async function startAddWordDialog(ctx: Context, pool: PrismaClient): Promise<void> {
  const uid = ctx.from?.id;
  if (!uid) return;

  if (!(await requireUserLanguagesSetOrReply(ctx, pool))) return;

  const names = await getUserLanguageNames(pool, uid);
  if (!names) {
    await ctx.reply(botT(ctx, 'missing_langs'));
    return;
  }

  setAddWordFlowState(uid, {
    step: 'await_primary',
    primaryLangName: names.primaryName,
    learningLangName: names.learningName,
  });

  await ctx.reply(botT(ctx, 'add_flow_prompt_primary', { langName: names.primaryName }));
}

export async function handleAddWordPickCallback(ctx: ActionContext, pool: PrismaClient): Promise<void> {
  const uid = ctx.from?.id;
  if (!uid) return;

  const pairId = Number(ctx.match?.[1]);
  if (!Number.isFinite(pairId)) {
    await ctx.answerCbQuery(botT(ctx, 'callback_invalid_id'));
    return;
  }

  const state = getAddWordFlowState(uid);
  if (!state || state.step !== 'await_learning') {
    await ctx.answerCbQuery();
    return;
  }

  const picked = state.suggestedPairs.find((p) => p.pairId === pairId);
  if (!picked) {
    await ctx.answerCbQuery(botT(ctx, 'callback_invalid_id'));
    return;
  }

  await attachUserToVocabPair(pool, uid, pairId);
  clearAddWordFlow(uid);
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    botT(ctx, 'add_flow_done', {
      primary: state.primaryText,
      learning: picked.learningText,
      pairId,
    }),
  );
}

export async function handleAddWordFlowText(ctx: Context, pool: PrismaClient): Promise<void> {
  const uid = ctx.from?.id;
  const raw = getMessageText(ctx);
  if (!uid || raw === undefined) return;
  if (raw.startsWith('/')) return;

  const state = getAddWordFlowState(uid);
  if (!state) return;

  const text = raw.trim();

  if (state.step === 'await_primary') {
    if (!text) {
      await ctx.reply(botT(ctx, 'add_flow_prompt_primary', { langName: state.primaryLangName }));
      return;
    }

    if (!(await requireUserLanguagesSetOrReply(ctx, pool))) {
      clearAddWordFlow(uid);
      return;
    }

    const { primaryLangId, learningLangId } = await getUserLanguages(pool, uid);
    if (primaryLangId == null || learningLangId == null) {
      clearAddWordFlow(uid);
      return;
    }

    const primaryWord = await findOrCreateVocabWord(pool, primaryLangId, text);
    const suggestedPairs = await findExistingPairsForPrimaryWord(
      pool,
      primaryWord.id,
      learningLangId,
    );

    setAddWordFlowState(uid, {
      step: 'await_learning',
      primaryWordId: primaryWord.id,
      primaryText: primaryWord.text,
      learningLangName: state.learningLangName,
      suggestedPairs,
    });

    if (suggestedPairs.length > 0) {
      const rows = suggestedPairs.map((p) => [
        { text: truncateLabel(p.learningText), callback_data: `add_pick_${p.pairId}` },
      ]);
      const body = `${botT(ctx, 'add_flow_suggestions_intro')}\n\n${botT(ctx, 'add_flow_prompt_learning', { langName: state.learningLangName })}`;
      await ctx.reply(body, {
        reply_markup: { inline_keyboard: rows },
      });
    } else {
      await ctx.reply(botT(ctx, 'add_flow_prompt_learning', { langName: state.learningLangName }));
    }
    return;
  }

  if (state.step === 'await_learning') {
    if (!text) {
      await ctx.reply(botT(ctx, 'add_flow_prompt_learning', { langName: state.learningLangName }));
      return;
    }

    if (!(await requireUserLanguagesSetOrReply(ctx, pool))) {
      clearAddWordFlow(uid);
      return;
    }

    const { learningLangId } = await getUserLanguages(pool, uid);
    if (learningLangId == null) {
      clearAddWordFlow(uid);
      return;
    }

    const nowMs = Date.now();
    const pairId = await createPairFromPrimaryWordAndLearningText(
      pool,
      uid,
      state.primaryWordId,
      learningLangId,
      text,
      nowMs,
    );

    clearAddWordFlow(uid);
    await ctx.reply(
      botT(ctx, 'add_flow_done', {
        primary: state.primaryText,
        learning: text,
        pairId,
      }),
    );
  }
}
