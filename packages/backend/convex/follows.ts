import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/** Follow / unfollow a seller. Returns the new state (true = now following). */
export const toggle = mutation({
  args: { followerId: v.id('users'), sellerId: v.id('users') },
  handler: async (ctx, { followerId, sellerId }) => {
    if (followerId === sellerId) return false; // can't follow yourself
    const existing = await ctx.db
      .query('follows')
      .withIndex('by_pair', (q) => q.eq('followerId', followerId).eq('sellerId', sellerId))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
      return false;
    }
    await ctx.db.insert('follows', { followerId, sellerId });
    return true;
  },
});

/** Whether `followerId` currently follows `sellerId`. */
export const isFollowing = query({
  args: { followerId: v.id('users'), sellerId: v.id('users') },
  handler: async (ctx, { followerId, sellerId }) => {
    const row = await ctx.db
      .query('follows')
      .withIndex('by_pair', (q) => q.eq('followerId', followerId).eq('sellerId', sellerId))
      .first();
    return !!row;
  },
});

/** Follower count for a seller. */
export const followerCount = query({
  args: { sellerId: v.id('users') },
  handler: async (ctx, { sellerId }) => {
    const rows = await ctx.db
      .query('follows')
      .withIndex('by_seller', (q) => q.eq('sellerId', sellerId))
      .collect();
    return rows.length;
  },
});
