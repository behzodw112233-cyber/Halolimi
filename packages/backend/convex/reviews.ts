import { v } from 'convex/values';
import { mutation, query, type MutationCtx } from './_generated/server';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';

/** Clamp a raw star value into the valid 1..5 range. */
function clampStars(n: number): number {
  return Math.max(1, Math.min(5, Math.round(n)));
}

/** Recompute a seller's denormalized rating sum/count from their reviews. */
async function recomputeSellerRating(ctx: MutationCtx, sellerId: Id<'users'>) {
  const rows = await ctx.db
    .query('reviews')
    .withIndex('by_seller', (q) => q.eq('sellerId', sellerId))
    .collect();
  const ratingCount = rows.length;
  const ratingSum = rows.reduce((s, r) => s + r.rating, 0);
  await ctx.db.patch(sellerId, { ratingSum, ratingCount });
}

/**
 * Leave (or update) a review for a seller. A given author has at most one review
 * per seller, so re-submitting edits the existing one. Sellers can't review
 * themselves.
 */
export const create = mutation({
  args: {
    sellerId: v.id('users'),
    authorId: v.optional(v.id('users')),
    authorName: v.string(),
    rating: v.number(),
    text: v.string(),
  },
  handler: async (ctx, { sellerId, authorId, authorName, rating, text }) => {
    if (authorId && authorId === sellerId) {
      throw new Error('Oʻzingizni baholay olmaysiz');
    }
    const stars = clampStars(rating);
    // Upsert by (seller, author) when we know the author.
    if (authorId) {
      const existing = await ctx.db
        .query('reviews')
        .withIndex('by_seller_author', (q) =>
          q.eq('sellerId', sellerId).eq('authorId', authorId)
        )
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, { rating: stars, text, authorName, createdAt: Date.now() });
        await recomputeSellerRating(ctx, sellerId);
        return existing._id;
      }
    }
    const id = await ctx.db.insert('reviews', {
      sellerId,
      authorId,
      authorName,
      rating: stars,
      text,
      createdAt: Date.now(),
    });
    await recomputeSellerRating(ctx, sellerId);
    await ctx.scheduler.runAfter(0, internal.push.send, {
      userId: sellerId,
      title: 'Yangi sharh ⭐',
      body: `${authorName} sizga ${stars} yulduz berdi.`,
      data: { type: 'review', sellerId },
    });
    return id;
  },
});

/** All reviews for a seller, newest first. */
export const forSeller = query({
  args: { sellerId: v.id('users') },
  handler: (ctx, { sellerId }) =>
    ctx.db
      .query('reviews')
      .withIndex('by_seller', (q) => q.eq('sellerId', sellerId))
      .order('desc')
      .collect(),
});

/** Average + count for a seller (safe defaults when there are no reviews). */
export const summary = query({
  args: { sellerId: v.id('users') },
  handler: async (ctx, { sellerId }) => {
    const rows = await ctx.db
      .query('reviews')
      .withIndex('by_seller', (q) => q.eq('sellerId', sellerId))
      .collect();
    const count = rows.length;
    const average = count ? rows.reduce((s, r) => s + r.rating, 0) / count : 0;
    return { average, count };
  },
});

/** Admin: every review (newest first) for the moderation page. */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query('reviews').order('desc').collect();
    return Promise.all(
      rows.map(async (r) => {
        const seller = await ctx.db.get(r.sellerId);
        return { ...r, sellerName: seller?.name ?? '—' };
      })
    );
  },
});

/** Admin: delete a review and refresh the seller's rating. */
export const remove = mutation({
  args: { id: v.id('reviews') },
  handler: async (ctx, { id }) => {
    const review = await ctx.db.get(id);
    if (!review) return;
    await ctx.db.delete(id);
    await recomputeSellerRating(ctx, review.sellerId);
  },
});
