import { v } from 'convex/values';
import type { Doc } from './_generated/dataModel';
import { mutation, query, type QueryCtx } from './_generated/server';
import { listingStatus, listingTier } from './schema';

// Relative promotion strength per tier (multiplied by the admin promo weight).
const TIER_WEIGHT: Record<string, number> = { alo: 1, zor: 2, vip: 4, lux: 8 };
const DAY_MS = 24 * 60 * 60 * 1000;

/** Attach resolved, servable image URLs from the listing's storage ids. */
async function withUrls(ctx: QueryCtx, l: Doc<'listings'>) {
  const urls = l.photos
    ? await Promise.all(l.photos.map((id) => ctx.storage.getUrl(id)))
    : [];
  return { ...l, photoUrls: urls.filter((u): u is string => u !== null) };
}

// A manual feed priority point outweighs any algorithm signal, so the admin's
// hand-picked order (drag / priority number) is authoritative, while promo +
// recency still break ties among listings with the same manual priority.
const MANUAL_WEIGHT = 100_000;

/**
 * Feed score for a listing. Higher ranks first.
 *  - pinned listings are forced to the very top
 *  - the admin's manual feedBoost dominates everything below the pin
 *  - an active promotion boost adds points scaled by the admin promo weight
 *  - recency contributes points that decay over 30 days, scaled by recency weight
 */
function feedScore(
  l: Doc<'listings'>,
  now: number,
  recencyWeight: number,
  promoWeight: number
) {
  const ageDays = (now - l.createdAt) / DAY_MS;
  const recency = Math.max(0, 30 - ageDays);
  const boostActive = !!l.boostedUntil && l.boostedUntil > now;
  const promo = boostActive && l.tier ? TIER_WEIGHT[l.tier] * 10 : 0;
  const manual = (l.feedBoost ?? 0) * MANUAL_WEIGHT;
  return (
    (l.pinned ? 1_000_000_000 : 0) +
    manual +
    promo * promoWeight +
    recency * recencyWeight
  );
}

export const list = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, { category }) => {
    const rows = category
      ? await ctx.db
          .query('listings')
          .withIndex('by_category', (q) => q.eq('category', category))
          .collect()
      : await ctx.db.query('listings').collect();
    const sorted = rows.sort((a, b) => b.createdAt - a.createdAt);
    return Promise.all(sorted.map((l) => withUrls(ctx, l)));
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

    // Rank by the admin-tunable feed algorithm.
    const settings = await ctx.db.query('settings').first();
    const recencyWeight = settings?.feedRecencyWeight ?? 1;
    const promoWeight = settings?.feedPromoWeight ?? 1;
    const now = Date.now();
    const ranked = filtered
      .map((l) => ({ l, score: feedScore(l, now, recencyWeight, promoWeight) }))
      .sort((a, b) => b.score - a.score || b.l.createdAt - a.l.createdAt)
      .map((x) => x.l);
    return Promise.all(ranked.map((l) => withUrls(ctx, l)));
  },
});

export const get = query({
  args: { id: v.id('listings') },
  handler: async (ctx, { id }) => {
    const l = await ctx.db.get(id);
    return l ? withUrls(ctx, l) : null;
  },
});

export const byOwner = query({
  args: { ownerId: v.id('users') },
  handler: async (ctx, { ownerId }) => {
    const rows = await ctx.db
      .query('listings')
      .withIndex('by_owner', (q) => q.eq('ownerId', ownerId))
      .collect();
    const sorted = rows.sort((a, b) => b.createdAt - a.createdAt);
    return Promise.all(sorted.map((l) => withUrls(ctx, l)));
  },
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
    ownerId: v.optional(v.id('users')),
    photos: v.optional(v.array(v.id('_storage'))),
  },
  handler: async (ctx, args) => {
    // Admin control: blocked users cannot create listings.
    if (args.ownerId) {
      const owner = await ctx.db.get(args.ownerId);
      if (owner?.status === 'blocked') throw new Error('Hisobingiz bloklangan');
    }
    // Admin control: auto-approve setting decides pending vs active.
    const settings = await ctx.db.query('settings').first();
    const status = settings?.autoApprove ? 'active' : 'pending';
    return await ctx.db.insert('listings', { ...args, status, createdAt: Date.now() });
  },
});

export const setStatus = mutation({
  args: { id: v.id('listings'), status: listingStatus },
  handler: (ctx, { id, status }) => ctx.db.patch(id, { status }),
});

/** Count one detail-screen open. Best-effort — never blocks the screen. */
export const incrementViews = mutation({
  args: { id: v.id('listings') },
  handler: async (ctx, { id }) => {
    const l = await ctx.db.get(id);
    if (!l) return;
    await ctx.db.patch(id, { views: (l.views ?? 0) + 1 });
  },
});

/**
 * Seller marks a listing sold: flip status and bump their soldCount so the
 * seller profile "N sotildi" trust number stays accurate.
 */
export const markSold = mutation({
  args: { id: v.id('listings') },
  handler: async (ctx, { id }) => {
    const l = await ctx.db.get(id);
    if (!l || l.status === 'sold') return;
    await ctx.db.patch(id, { status: 'sold' });
    if (l.ownerId) {
      const owner = await ctx.db.get(l.ownerId);
      if (owner) await ctx.db.patch(l.ownerId, { soldCount: (owner.soldCount ?? 0) + 1 });
    }
  },
});

/**
 * Related listings for the detail screen: other active listings in the same
 * category (falls back to any active listing), most recent first.
 */
export const related = query({
  args: { id: v.id('listings'), limit: v.optional(v.number()) },
  handler: async (ctx, { id, limit }) => {
    const base = await ctx.db.get(id);
    if (!base) return [];
    const sameCat = await ctx.db
      .query('listings')
      .withIndex('by_category', (q) => q.eq('category', base.category))
      .collect();
    let pool = sameCat.filter((l) => l._id !== id && l.status === 'active');
    if (pool.length === 0) {
      const active = await ctx.db
        .query('listings')
        .withIndex('by_status', (q) => q.eq('status', 'active'))
        .collect();
      pool = active.filter((l) => l._id !== id);
    }
    const ranked = pool.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit ?? 6);
    return Promise.all(ranked.map((l) => withUrls(ctx, l)));
  },
});

export const remove = mutation({
  args: { id: v.id('listings') },
  handler: (ctx, { id }) => ctx.db.delete(id),
});

/** Apply a promotion tier — boosts the listing in the feed for feedBoostDays. */
export const promote = mutation({
  args: { id: v.id('listings'), tier: listingTier },
  handler: async (ctx, { id, tier }) => {
    const settings = await ctx.db.query('settings').first();
    const days = settings?.feedBoostDays ?? 28;
    await ctx.db.patch(id, { tier, boostedUntil: Date.now() + days * DAY_MS });
  },
});

/** Admin: remove a promotion tier / boost from a listing. */
export const clearPromo = mutation({
  args: { id: v.id('listings') },
  handler: (ctx, { id }) => ctx.db.patch(id, { tier: undefined, boostedUntil: undefined }),
});

/** Admin manual feature: force a listing to the top of the feed. */
export const setPinned = mutation({
  args: { id: v.id('listings'), pinned: v.boolean() },
  handler: (ctx, { id, pinned }) => ctx.db.patch(id, { pinned }),
});

/** Admin manual feed priority for a single listing (higher = pushed up). */
export const setFeedBoost = mutation({
  args: { id: v.id('listings'), feedBoost: v.number() },
  handler: (ctx, { id, feedBoost }) =>
    ctx.db.patch(id, { feedBoost: Math.max(0, Math.round(feedBoost)) }),
});

/**
 * Admin drag-to-reorder: takes the ids in the exact order the admin wants and
 * writes descending feedBoost values so the feed locks to that order. The first
 * id gets the highest priority.
 */
export const reorderFeed = mutation({
  args: { ids: v.array(v.id('listings')) },
  handler: async (ctx, { ids }) => {
    const n = ids.length;
    await Promise.all(
      ids.map((id, i) => ctx.db.patch(id, { feedBoost: n - i }))
    );
  },
});

/**
 * Admin Feed page data: every active listing (the ones that actually appear in
 * the feed) in true ranked order, with its computed score + control fields.
 */
export const feedManage = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query('listings')
      .withIndex('by_status', (q) => q.eq('status', 'active'))
      .collect();
    const settings = await ctx.db.query('settings').first();
    const recencyWeight = settings?.feedRecencyWeight ?? 1;
    const promoWeight = settings?.feedPromoWeight ?? 1;
    const now = Date.now();
    const ranked = rows
      .map((l) => ({ l, score: feedScore(l, now, recencyWeight, promoWeight) }))
      .sort((a, b) => b.score - a.score || b.l.createdAt - a.l.createdAt);
    return Promise.all(
      ranked.map(async ({ l, score }) => ({
        ...(await withUrls(ctx, l)),
        score: Math.round(score),
        boostActive: !!l.boostedUntil && l.boostedUntil > now,
      }))
    );
  },
});
