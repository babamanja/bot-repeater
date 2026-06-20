import { handleAddLangCommand, handleSetLanguageAction } from './handler';
export function registerLanguageCommands(bot, pool) {
    // match[1] = "primary" | "learning", match[2] = language id
    bot.action(/^set_(primary|learning)_(\d+)$/, (ctx) => handleSetLanguageAction(ctx, pool));
    bot.command('addLang', (ctx) => handleAddLangCommand(ctx, pool));
}
