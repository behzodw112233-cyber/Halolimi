import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/** Saved listing ids for a user (for heart states). */
export const ids = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const rows = await ctx.db
      .query('saved')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    return rows.map((r) => r.listingId);
  },
});

/** Full saved listings for a user (with resolved photo URLs). */
export const list = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const rows = await ctx.db
      .query('saved')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    const listings = await Promise.all(rows.map((r) => ctx.db.get(r.listingId)));
    return Promise.all(
      listings
        .filter((l): l is NonNullable<typeof l> => l !== null)
        .map(async (l) => {
          const urls = l.photos ? await Promise.all(l.photos.map((id) => ctx.storage.getUrl(id))) : [];
          return { ...l, photoUrls: urls.filter((u): u is string => u !== null) };
        })
    );
  },
});

export const toggle = mutation({
  args: { userId: v.id('users'), listingId: v.id('listings') },
  handler: async (ctx, { userId, listingId }) => {
    const existing = await ctx.db
      .query('saved')
      .withIndex('by_user_listing', (q) => q.eq('userId', userId).eq('listingId', listingId))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
      return false;
    }
    await ctx.db.insert('saved', { userId, listingId });
    return true;
  },
});
