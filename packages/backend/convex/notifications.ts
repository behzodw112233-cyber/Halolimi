import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { mutation, query } from './_generated/server';

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
  return ctx.db.insert('userNotifications', {
    userId: args.userId,
    icon: args.icon,
    title: args.title,
    body: args.body,
    targetType: args.targetType,
    targetId: args.targetId,
    createdAt: Date.now(),
  });
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
