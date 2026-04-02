import type { Context } from 'telegraf';

/** Context passed to `bot.action(RegExp)` — includes `match` with capture groups. */
export type ActionContext = Context & { match?: RegExpExecArray };

export function getMessageText(ctx: Context): string | undefined {
  const m = ctx.message;
  if (m && 'text' in m) return m.text;
  return undefined;
}

/** Escape for Telegram HTML parse mode (text nodes and attributes). */
export function escapeHtmlText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
