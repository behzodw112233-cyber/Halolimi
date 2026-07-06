import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { adStatus } from './schema';

/** Active ads for a given placement ('app' | 'bot') — used by the app & bot. */
export const byPlacement = query({
  args: { placement: v.string() },
  handler: async (ctx, { placement }) => {
    const active = await ctx.db
      .query('ads')
      .withIndex('by_status', (q) => q.eq('status', 'active'))
      .collect();
    return active.filter((a) => a.placements.includes(placement));
  },
});

/** All ads — used by the admin Ads Manager. */
export const list = query({
  args: {},
  handler: (ctx) => ctx.db.query('ads').collect(),
});

export const create = mutation({
  args: {
    advertiser: v.string(),
    emoji: v.string(),
    grad: v.array(v.string()),
    headline: v.string(),
    body: v.string(),
    cta: v.string(),
    url: v.string(),
    placements: v.array(v.string()),
    budget: v.number(),
  },
  handler: (ctx, args) =>
    ctx.db.insert('ads', {
      ...args,
      status: 'active',
      spent: 0,
      impressions: 0,
      clicks: 0,
      start: new Date().toLocaleDateString('ru-RU'),
      end: '—',
    }),
});

export const setStatus = mutation({
  args: { id: v.id('ads'), status: adStatus },
  handler: (ctx, { id, status }) => ctx.db.patch(id, { status }),
});

export const remove = mutation({
  args: { id: v.id('ads') },
  handler: (ctx, { id }) => ctx.db.delete(id),
});
