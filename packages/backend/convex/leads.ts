import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { leadStatus, leadType } from './schema';

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query('leads').collect();
    return rows.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    type: leadType,
    contactName: v.string(),
    phone: v.string(),
    region: v.string(),
    category: v.string(),
    source: v.string(),
    estimatedValue: v.optional(v.number()),
    owner: v.string(),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert('leads', {
      ...args,
      status: 'new',
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateStatus = mutation({
  args: { id: v.id('leads'), status: leadStatus },
  handler: async (ctx, { id, status }) => {
    await ctx.db.patch(id, { status, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id('leads') },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
