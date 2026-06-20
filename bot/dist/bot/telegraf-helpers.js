export function getMessageText(ctx) {
    const m = ctx.message;
    if (m && 'text' in m)
        return m.text;
    return undefined;
}
/** Escape for Telegram HTML parse mode (text nodes and attributes). */
export function escapeHtmlText(s) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
