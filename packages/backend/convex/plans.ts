import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const get = query({
  args: { kind: v.union(v.literal('whiteboard'), v.literal('kanban')) },
  handler: async (ctx, { kind }) => {
    return await ctx.db
      .query('plans')
      .withIndex('by_kind', (q) => q.eq('kind', kind))
      .first();
  },
});

export const save = mutation({
  args: {
    kind: v.union(v.literal('whiteboard'), v.literal('kanban')),
    title: v.string(),
    data: v.any(),
  },
  handler: async (ctx, { kind, title, data }) => {
    const now = Date.now();
    const existing = await ctx.db
      .query('plans')
      .withIndex('by_kind', (q) => q.eq('kind', kind))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { title, data, updatedAt: now });
      return existing._id;
    }

    return await ctx.db.insert('plans', {
      kind,
      title,
      data,
      createdAt: now,
      updatedAt: now,
    });
  },
});
