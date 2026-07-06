import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const list = query({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    const rows = await ctx.db
      .query('messages')
      .withIndex('by_thread', (q) => q.eq('threadId', threadId))
      .collect();
    return rows.sort((a, b) => a.createdAt - b.createdAt);
  },
});

/** Threads the given user has participated in, newest activity first. */
export const threads = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const mine = await ctx.db
      .query('messages')
      .filter((q) => q.eq(q.field('senderId'), userId))
      .collect();

    const threadIds = [...new Set(mine.map((m) => m.threadId))];

    const rows = await Promise.all(
      threadIds.map(async (threadId) => {
        const msgs = await ctx.db
          .query('messages')
          .withIndex('by_thread', (q) => q.eq('threadId', threadId))
          .collect();
        const last = msgs.sort((a, b) => b.createdAt - a.createdAt)[0];
        return {
          threadId,
          lastText: last?.text ?? '',
          lastAt: last?.createdAt ?? 0,
        };
      })
    );

    return rows.sort((a, b) => b.lastAt - a.lastAt);
  },
});

export const send = mutation({
  args: {
    threadId: v.string(),
    senderId: v.optional(v.id('users')),
    senderName: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    // Admin control: blocked users cannot send messages.
    if (args.senderId) {
      const sender = await ctx.db.get(args.senderId);
      if (sender?.status === 'blocked') throw new Error('Hisobingiz bloklangan');
    }
    return await ctx.db.insert('messages', { ...args, createdAt: Date.now() });
  },
});
