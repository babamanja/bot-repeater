import { addLanguageByName, getAllLanguages, LanguageNotFoundError, setUserLanguage, } from '../../domain/vocab';
import { getUserLanguages } from '../../domain/telegram-user';
import { mainReplyKeyboard } from '../user/telegram-ui';
import { getMessageText } from '../telegraf-helpers';
import { botT } from '../../i18n';
import { ensureUserByTelegram } from '../../domain/telegram-user';
export async function showLangSelect(ctx, pool, langKey, callbackPrefix) {
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
export async function handleSetLanguageAction(ctx, pool) {
    const kind = ctx.match?.[1];
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
        await ensureUserByTelegram(pool, {
            id: telegramUserId,
            username: ctx.from?.username,
            firstName: ctx.from?.first_name,
            lastName: ctx.from?.last_name,
        });
        await setUserLanguage(pool, telegramUserId, langId, kind);
    }
    catch (e) {
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
        }
        else {
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
function getRest(text) {
    return text.replace(/^\/\w+(?:@\w+)?/i, '').trim();
}
export async function handleAddLangCommand(ctx, pool) {
    const text = getMessageText(ctx) ?? '';
    const rest = getRest(text);
    if (!rest) {
        await ctx.reply(botT(ctx, 'addlang_format'));
        return;
    }
    const langId = await addLanguageByName(pool, rest);
    await ctx.reply(botT(ctx, 'addlang_success', { langId, langName: rest }));
}
