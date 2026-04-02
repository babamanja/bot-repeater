import { Telegraf } from 'telegraf';
import type { PrismaClient } from '../../../prisma/src/generated/prisma';
import { handleAddLangCommand, handleSetLanguageAction } from './handler';

export function registerLanguageCommands(bot: Telegraf, pool: PrismaClient): void {
  // match[1] = "primary" | "learning", match[2] = language id
  bot.action(/^set_(primary|learning)_(\d+)$/, (ctx) => handleSetLanguageAction(ctx, pool));
  bot.command('addLang', (ctx) => handleAddLangCommand(ctx, pool));
}
