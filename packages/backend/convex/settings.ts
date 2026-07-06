import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const DEFAULTS = {
  platformName: 'Halolmi',
  currency: 'UZS',
  language: 'uz',
  autoApprove: false,
  allowNoPhoto: true,
  notifyNewListing: true,
  payme: true,
  click: true,
  uzcard: true,
  // Feed algorithm defaults
  feedRecencyWeight: 1,
  feedPromoWeight: 1,
  feedBoostDays: 28,
};

/** Platform settings (single row); returns defaults if unset. */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db.query('settings').first();
    return { ...DEFAULTS, ...(row ?? {}) };
  },
});

export const update = mutation({
  args: {
    platformName: v.string(),
    currency: v.string(),
    language: v.string(),
    autoApprove: v.boolean(),
    allowNoPhoto: v.boolean(),
    notifyNewListing: v.boolean(),
    payme: v.boolean(),
    click: v.boolean(),
    uzcard: v.boolean(),
    feedRecencyWeight: v.number(),
    feedPromoWeight: v.number(),
    feedBoostDays: v.number(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.query('settings').first();
    if (row) await ctx.db.patch(row._id, args);
    else await ctx.db.insert('settings', args);
  },
});
