import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { internal } from './_generated/api';
import type { MutationCtx } from './_generated/server';
import { internalAction, internalQuery, mutation, query } from './_generated/server';

declare const process: { env: Record<string, string | undefined> };

/** Global announcements, newest first. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query('notifications').collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export async function createForUser(
  ctx: MutationCtx,
  args: {
    userId: Id<'users'>;
    icon: string;
    title: string;
    body: string;
    targetType?: string;
    targetId?: string;
  }
) {
  const id = await ctx.db.insert('userNotifications', {
    userId: args.userId,
    icon: args.icon,
    title: args.title,
    body: args.body,
    targetType: args.targetType,
    targetId: args.targetId,
    createdAt: Date.now(),
  });
  await ctx.scheduler.runAfter(0, internal.notifications.sendTelegramForUser, {
    userId: args.userId,
    title: args.title,
    body: args.body,
    targetType: args.targetType,
    targetId: args.targetId,
  });
  return id;
}

export const sendTelegramForUser = internalAction({
  args: {
    userId: v.id('users'),
    title: v.string(),
    body: v.string(),
    targetType: v.optional(v.string()),
    targetId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ ok: boolean; reason?: string }> => {
    const token = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return { ok: false, reason: 'missing token' };
    const user: { telegramId?: string } | null = await ctx.runQuery(internal.notifications.telegramUser, { userId: args.userId });
    if (!user?.telegramId) return { ok: false, reason: 'not linked' };
    const appBase = process.env.HALOLMIA_APP_URL || process.env.EXPO_PUBLIC_APP_URL;
    const targetPath =
      args.targetType === 'listing' && args.targetId
        ? `/listing/${args.targetId}`
        : args.targetType === 'chat' && args.targetId
          ? `/chat/${args.targetId}`
          : args.targetType === 'profile'
            ? '/profile'
            : '';
    const link = targetPath
      ? appBase
        ? `\n\n${appBase.replace(/\/$/, '')}${targetPath}`
        : `\n\nhalolmia://${targetPath.replace(/^\//, '')}`
      : '';
    const text = `<b>${escapeHtml(args.title)}</b>\n${escapeHtml(args.body)}${escapeHtml(link)}`;
    const response: Response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: user.telegramId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    return { ok: response.ok };
  },
});

export const telegramUser = internalQuery({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    return user ? { telegramId: user.telegramId } : null;
  },
});

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Personalized inbox events, newest first. */
export const listForUser = query({
  args: { userId: v.optional(v.id('users')), limit: v.optional(v.number()) },
  handler: async (ctx, { userId, limit }) => {
    if (!userId) return [];
    const rows = await ctx.db
      .query('userNotifications')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    return rows
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit ?? 50);
  },
});

export const markAllRead = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const now = Date.now();
    const unread = await ctx.db
      .query('userNotifications')
      .withIndex('by_user_read', (q) => q.eq('userId', userId).eq('readAt', undefined))
      .collect();
    await Promise.all(unread.map((n) => ctx.db.patch(n._id, { readAt: now })));
  },
});
