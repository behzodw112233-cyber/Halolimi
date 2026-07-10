import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { userStatus } from './schema';

const ONLINE_MS = 3 * 60 * 1000;
const RECENT_MS = 24 * 60 * 60 * 1000;
const HEARTBEAT_WRITE_MS = 2 * 60 * 1000;

function trustSummary({
  phone,
  telegramId,
  rating,
  ratingCount,
  reportCount,
  lastSeen,
  now,
}: {
  phone?: string;
  telegramId?: string;
  rating: number;
  ratingCount: number;
  reportCount: number;
  lastSeen?: number;
  now: number;
}) {
  const phoneVerified = !!phone;
  const telegramLinked = !!telegramId;
  const activeRecently = !!lastSeen && now - lastSeen < RECENT_MS;
  const goodReviews = ratingCount > 0 && rating >= 4;
  const noReports = reportCount === 0;
  return {
    phoneVerified,
    telegramLinked,
    activeRecently,
    noReports,
    goodReviews,
    verified: phoneVerified && telegramLinked && activeRecently && noReports && goodReviews,
    reportCount,
  };
}

export const list = query({
  args: {},
  handler: (ctx) => ctx.db.query('users').collect(),
});

export const get = query({
  args: { id: v.id('users') },
  handler: (ctx, { id }) => ctx.db.get(id),
});

/** Lightweight phone "login": find-or-create a user, returns the id. */
export const getOrCreate = mutation({
  args: { phone: v.string(), name: v.optional(v.string()) },
  handler: async (ctx, { phone, name }) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_phone', (q) => q.eq('phone', phone))
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert('users', {
      name: name?.trim() || 'Foydalanuvchi',
      phone,
      listings: 0,
      joined: new Date().toLocaleDateString('ru-RU'),
      status: 'active',
    });
  },
});

/** Edit the seller's own profile (name / bio / avatar). Only sets given fields. */
export const updateProfile = mutation({
  args: {
    id: v.id('users'),
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
    avatar: v.optional(v.id('_storage')),
  },
  handler: async (ctx, { id, name, bio, avatar }) => {
    const patch: Record<string, unknown> = {};
    if (name !== undefined) patch.name = name.trim() || 'Foydalanuvchi';
    if (bio !== undefined) patch.bio = bio;
    if (avatar !== undefined) patch.avatar = avatar;
    await ctx.db.patch(id, patch);
  },
});

/**
 * Public seller profile: the user plus derived trust numbers (rating average,
 * active/sold listing counts, follower count, resolved avatar URL).
 */
export const sellerProfile = query({
  args: { id: v.id('users'), now: v.optional(v.number()) },
  handler: async (ctx, { id, now: nowArg }) => {
    const u = await ctx.db.get(id);
    if (!u) return null;
    const listings = await ctx.db
      .query('listings')
      .withIndex('by_owner', (q) => q.eq('ownerId', id))
      .collect();
    const active = listings.filter((l) => l.status === 'active').length;
    const sold = listings.filter((l) => l.status === 'sold').length;
    const followers = await ctx.db
      .query('follows')
      .withIndex('by_seller', (q) => q.eq('sellerId', id))
      .collect();
    const reports = await ctx.db
      .query('reports')
      .withIndex('by_seller', (q) => q.eq('sellerId', id))
      .collect();
    const ratingCount = u.ratingCount ?? 0;
    const rating = ratingCount ? (u.ratingSum ?? 0) / ratingCount : 0;
    const avatarUrl = u.avatar ? await ctx.storage.getUrl(u.avatar) : null;
    const now = nowArg ?? Date.now();
    const trust = trustSummary({
      phone: u.phone,
      telegramId: u.telegramId,
      rating,
      ratingCount,
      reportCount: reports.length,
      lastSeen: u.lastSeen,
      now,
    });
    return {
      _id: u._id,
      name: u.name,
      phone: u.phone,
      phoneVerified: trust.phoneVerified,
      telegramLinked: trust.telegramLinked,
      isDealer: !!u.isDealer,
      activeRecently: trust.activeRecently,
      noReports: trust.noReports,
      goodReviews: trust.goodReviews,
      verified: trust.verified,
      reportCount: trust.reportCount,
      bio: u.bio ?? '',
      joined: u.joined,
      avatarUrl,
      rating,
      ratingCount,
      activeCount: active,
      soldCount: sold,
      followerCount: followers.length,
      lastSeen: u.lastSeen,
      online: !!u.lastSeen && now - u.lastSeen < ONLINE_MS,
    };
  },
});

/** Presence heartbeat — call periodically while the app is foregrounded. */
export const heartbeat = mutation({
  args: { id: v.id('users') },
  handler: async (ctx, { id }) => {
    const now = Date.now();
    const user = await ctx.db.get(id);
    if (!user || (user.lastSeen && now - user.lastSeen < HEARTBEAT_WRITE_MS)) return;
    await ctx.db.patch(id, { lastSeen: now });
  },
});

export const setStatus = mutation({
  args: { id: v.id('users'), status: userStatus },
  handler: (ctx, { id, status }) => ctx.db.patch(id, { status }),
});

/** Mark / unmark a user as an official dealer (admin panel). */
export const setDealer = mutation({
  args: { id: v.id('users'), isDealer: v.boolean() },
  handler: (ctx, { id, isDealer }) => ctx.db.patch(id, { isDealer }),
});

export const remove = mutation({
  args: { id: v.id('users') },
  handler: (ctx, { id }) => ctx.db.delete(id),
});
