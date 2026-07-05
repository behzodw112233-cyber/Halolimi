import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { listingStatus } from './schema';

export const list = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, { category }) => {
    const rows = category
      ? await ctx.db
          .query('listings')
          .withIndex('by_category', (q) => q.eq('category', category))
          .collect()
      : await ctx.db.query('listings').collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const listActive = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, { category }) => {
    const rows = await ctx.db
      .query('listings')
      .withIndex('by_status', (q) => q.eq('status', 'active'))
      .collect();
    const filtered = category ? rows.filter((r) => r.category === category) : rows;
    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const get = query({
  args: { id: v.id('listings') },
  handler: (ctx, { id }) => ctx.db.get(id),
});

export const create = mutation({
  args: {
    title: v.string(),
    price: v.string(),
    category: v.string(),
    city: v.string(),
    phone: v.string(),
    specs: v.array(v.object({ label: v.string(), value: v.string() })),
    desc: v.string(),
    sellerName: v.string(),
    photos: v.optional(v.array(v.string())),
  },
  handler: (ctx, args) =>
    ctx.db.insert('listings', { ...args, status: 'pending', createdAt: Date.now() }),
});

export const setStatus = mutation({
  args: { id: v.id('listings'), status: listingStatus },
  handler: (ctx, { id, status }) => ctx.db.patch(id, { status }),
});
