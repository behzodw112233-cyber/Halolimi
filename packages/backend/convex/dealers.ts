import { v } from 'convex/values';
import { mutation, query, type QueryCtx } from './_generated/server';
import type { Doc } from './_generated/dataModel';

/** Resolve the video + thumbnail URLs and the linked seller (name/avatar). */
async function withUrls(ctx: QueryCtx, d: Doc<'dealers'>) {
  const videoUrl = await ctx.storage.getUrl(d.videoId);
  const thumbUrl = d.thumbId ? await ctx.storage.getUrl(d.thumbId) : null;
  // A dealer attached to a real user shows that user's name/avatar and links
  // through to their seller profile. Fall back to the free-text `dealer` label.
  const user = d.userId ? await ctx.db.get(d.userId) : null;
  const avatarUrl = user?.avatar ? await ctx.storage.getUrl(user.avatar) : null;
  return {
    ...d,
    videoUrl,
    thumbUrl,
    sellerId: d.userId ?? null,
    sellerName: user?.name ?? d.dealer ?? null,
    avatarUrl,
  };
}

/** Active dealer showcases for the app home, in display order. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query('dealers')
      .withIndex('by_active', (q) => q.eq('active', true))
      .collect();
    const sorted = rows.sort((a, b) => a.order - b.order);
    return Promise.all(sorted.map((d) => withUrls(ctx, d)));
  },
});

/** All dealers (admin panel), newest first with resolved URLs. */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query('dealers').collect();
    const sorted = rows.sort((a, b) => b.createdAt - a.createdAt);
    return Promise.all(sorted.map((d) => withUrls(ctx, d)));
  },
});

/**
 * Create a dealer showcase from an uploaded video (+ optional poster).
 * Promotes a real user to an official dealer when `userId` is given — the card
 * then carries that seller's name/avatar and links to their profile.
 */
export const create = mutation({
  args: {
    title: v.string(),
    dealer: v.optional(v.string()),
    userId: v.optional(v.id('users')),
    videoId: v.id('_storage'),
    thumbId: v.optional(v.id('_storage')),
  },
  handler: async (ctx, { title, dealer, userId, videoId, thumbId }) => {
    const all = await ctx.db.query('dealers').collect();
    const order = all.reduce((m, d) => Math.max(m, d.order), -1) + 1;
    // Default the display label to the user's name when attaching to a user.
    let label = dealer?.trim() || undefined;
    if (!label && userId) {
      const u = await ctx.db.get(userId);
      label = u?.name;
    }
    return await ctx.db.insert('dealers', {
      title: title.trim(),
      dealer: label,
      userId,
      videoId,
      thumbId,
      order,
      active: true,
      createdAt: Date.now(),
    });
  },
});

/** Show/hide a dealer showcase without deleting it. */
export const setActive = mutation({
  args: { id: v.id('dealers'), active: v.boolean() },
  handler: (ctx, { id, active }) => ctx.db.patch(id, { active }),
});

/** Delete a dealer showcase and its uploaded files. */
export const remove = mutation({
  args: { id: v.id('dealers') },
  handler: async (ctx, { id }) => {
    const d = await ctx.db.get(id);
    if (!d) return;
    await ctx.storage.delete(d.videoId).catch(() => {});
    if (d.thumbId) await ctx.storage.delete(d.thumbId).catch(() => {});
    await ctx.db.delete(id);
  },
});
