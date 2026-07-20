import { v } from 'convex/values';
import { mutation, query, type QueryCtx } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import { reelStatus } from './schema';
import { enforceRateLimit } from './rateLimit';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const PERSONAL_SIGNAL_LIMIT = 40;
const SAME_SELLER_LOOKAHEAD = 8;
const PUBLIC_REEL_CANDIDATE_LIMIT = 240;
const COMMENT_LIMIT = 200;

type ReelCounts = {
  likes: number;
  comments: number;
  saves: number;
};

type ViewerProfile = {
  categories: Map<string, number>;
  cities: Map<string, number>;
  sellers: Map<string, number>;
  following: Set<string>;
  hiddenReels: Set<string>;
  hiddenSellers: Set<string>;
};

type RankedReel = {
  r: Doc<'reels'>;
  score: number;
  counts: ReelCounts;
};

async function countByReel(
  ctx: QueryCtx,
  table: 'reelLikes' | 'reelSaves' | 'reelComments',
  reelId: Id<'reels'>
) {
  const rows = await ctx.db
    .query(table)
    .withIndex('by_reel', (q) => q.eq('reelId', reelId))
    .collect();
  return rows.length;
}

async function viewerState(ctx: QueryCtx, reelId: Id<'reels'>, userId?: Id<'users'>) {
  if (!userId) {
    return { viewerLiked: false, viewerSaved: false, viewerFollowing: false };
  }
  const liked = await ctx.db
    .query('reelLikes')
    .withIndex('by_user_reel', (q) => q.eq('userId', userId).eq('reelId', reelId))
    .first();
  const saved = await ctx.db
    .query('reelSaves')
    .withIndex('by_user_reel', (q) => q.eq('userId', userId).eq('reelId', reelId))
    .first();
  return { viewerLiked: !!liked, viewerSaved: !!saved, viewerFollowing: false };
}

async function viewerProfile(ctx: QueryCtx, userId?: Id<'users'>): Promise<ViewerProfile> {
  const profile: ViewerProfile = {
    categories: new Map(),
    cities: new Map(),
    sellers: new Map(),
    following: new Set(),
    hiddenReels: new Set(),
    hiddenSellers: new Set(),
  };
  if (!userId) return profile;

  const [likedRows, savedRows, follows, hiddenRows] = await Promise.all([
    ctx.db
      .query('reelLikes')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .take(PERSONAL_SIGNAL_LIMIT),
    ctx.db
      .query('reelSaves')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .take(PERSONAL_SIGNAL_LIMIT),
    ctx.db
      .query('follows')
      .withIndex('by_follower', (q) => q.eq('followerId', userId))
      .collect(),
    ctx.db
      .query('reelHidden')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect(),
  ]);

  for (const follow of follows) profile.following.add(follow.sellerId);
  for (const hidden of hiddenRows) {
    if (hidden.reelId) profile.hiddenReels.add(hidden.reelId);
    if (hidden.sellerId) profile.hiddenSellers.add(hidden.sellerId);
  }

  const bump = (map: Map<string, number>, key: string | undefined, amount: number) => {
    if (!key) return;
    map.set(key, (map.get(key) ?? 0) + amount);
  };

  const signalRows = [
    ...likedRows.map((row) => ({ reelId: row.reelId, weight: 1 })),
    ...savedRows.map((row) => ({ reelId: row.reelId, weight: 2 })),
  ];
  const reels = await Promise.all(signalRows.map((row) => ctx.db.get(row.reelId)));
  reels.forEach((reel, i) => {
    if (!reel) return;
    const weight = signalRows[i].weight;
    bump(profile.categories, reel.category, weight * 2);
    bump(profile.cities, reel.city, weight);
    bump(profile.sellers, reel.sellerId, weight * 2);
  });

  return profile;
}

async function withUrls(ctx: QueryCtx, r: Doc<'reels'>, userId?: Id<'users'>) {
  const storageVideoUrl = r.videoId ? await ctx.storage.getUrl(r.videoId) : null;
  const storageThumbUrl = r.thumbId ? await ctx.storage.getUrl(r.thumbId) : null;
  const seller = r.sellerId ? await ctx.db.get(r.sellerId) : null;
  const sellerReports = r.sellerId
    ? await ctx.db
        .query('reports')
        .withIndex('by_seller', (q) => q.eq('sellerId', r.sellerId))
        .collect()
    : [];
  const sellerAvatarUrl = seller?.avatar ? await ctx.storage.getUrl(seller.avatar) : null;
  const likes = await countByReel(ctx, 'reelLikes', r._id);
  const saves = await countByReel(ctx, 'reelSaves', r._id);
  const comments = await countByReel(ctx, 'reelComments', r._id);
  const state = await viewerState(ctx, r._id, userId);
  let viewerFollowing = false;
  if (userId && r.sellerId) {
    const follow = await ctx.db
      .query('follows')
      .withIndex('by_pair', (q) => q.eq('followerId', userId).eq('sellerId', r.sellerId!))
      .first();
    viewerFollowing = !!follow;
  }
  return {
    ...r,
    videoUrl: r.hlsUrl ?? storageVideoUrl,
    thumbUrl: r.thumbnailUrl ?? storageThumbUrl,
    sellerName: seller?.name ?? null,
    sellerPhone: seller?.phone ?? null,
    sellerAvatarUrl,
    sellerIsDealer: !!seller?.isDealer,
    sellerVerified: !!seller?.verifiedAt,
    sellerPhoneVerified: !!seller?.phoneVerifiedAt || !!seller?.verifiedAt,
    sellerNoReports: sellerReports.filter((report) => report.status !== 'resolved').length === 0,
    likes,
    saves,
    comments,
    viewerLiked: state.viewerLiked,
    viewerSaved: state.viewerSaved,
    viewerFollowing,
  };
}

function smoothedRate(events: number, views: number, prior: number, strength: number) {
  return (events + prior * strength) / (views + strength);
}

function scoreReel(
  r: Doc<'reels'>,
  counts: ReelCounts,
  profile: ViewerProfile,
  now: number
) {
  const ageMs = Math.max(0, now - r.createdAt);
  const ageDays = ageMs / DAY_MS;
  const ageHours = ageMs / HOUR_MS;
  const views = Math.max(0, r.views ?? 0);
  const threeSecondViews = Math.max(0, r.threeSecondViews ?? 0);
  const halfViews = Math.max(0, r.halfViews ?? 0);
  const completions = Math.max(0, r.completions ?? 0);
  const replays = Math.max(0, r.replays ?? 0);
  const quickSkips = Math.max(0, r.quickSkips ?? 0);

  const watchSeconds = Math.max(0, (r.watchMs ?? 0) / 1000);
  const avgWatchSeconds = watchSeconds / Math.max(1, views);
  const completion =
    r.duration && r.duration > 0
      ? Math.min(1.25, avgWatchSeconds / r.duration)
      : Math.min(1.25, avgWatchSeconds / 12);

  // Bayesian-style smoothing keeps tiny samples from instantly dominating.
  const likeRate = smoothedRate(counts.likes, views, 0.04, 30);
  const saveRate = smoothedRate(counts.saves, views, 0.025, 30);
  const commentRate = smoothedRate(counts.comments, views, 0.012, 30);
  const chatRate = smoothedRate(r.chatTaps ?? 0, views, 0.01, 25);
  const callRate = smoothedRate(r.callTaps ?? 0, views, 0.008, 25);
  const threeSecondRate = smoothedRate(threeSecondViews, views, 0.55, 35);
  const halfRate = smoothedRate(halfViews, views, 0.3, 35);
  const completionRate = smoothedRate(completions, views, 0.12, 35);
  const replayRate = smoothedRate(replays, views, 0.035, 35);
  const quickSkipRate = smoothedRate(quickSkips, views, 0.18, 35);

  const watchQuality =
    completion * 230 +
    Math.min(180, avgWatchSeconds * 9) +
    threeSecondRate * 120 +
    halfRate * 240 +
    completionRate * 360 +
    replayRate * 420 -
    quickSkipRate * 260;
  const engagement = likeRate * 180 + saveRate * 320 + commentRate * 240;
  const marketplaceIntent = chatRate * 520 + callRate * 680 + (r.listingId ? 40 : 0) + (r.price ? 25 : 0);
  const freshness = Math.exp(-ageDays / 4) * 180;
  const exploration =
    views < 30
      ? Math.max(0, 30 - views) * 4 + Math.exp(-ageHours / 36) * 90
      : 0;
  const personalization =
    (r.category ? (profile.categories.get(r.category) ?? 0) * 18 : 0) +
    (r.city ? (profile.cities.get(r.city) ?? 0) * 10 : 0) +
    (r.sellerId ? (profile.sellers.get(r.sellerId) ?? 0) * 16 : 0) +
    (r.sellerId && profile.following.has(r.sellerId) ? 160 : 0);

  // Admin order should be a small editorial hint, not the feed algorithm.
  const manualHint = (r.order ?? 0) * 0.05;
  const lowQualityPenalty = views >= 8 && avgWatchSeconds < 2 ? 120 : 0;
  const stalePenalty = ageDays > 45 ? Math.min(180, (ageDays - 45) * 3) : 0;
  const pinned = r.pinned ? 1_000_000 : 0;

  return (
    pinned +
    watchQuality +
    engagement +
    marketplaceIntent +
    freshness +
    exploration +
    personalization +
    manualHint -
    lowQualityPenalty -
    stalePenalty
  );
}

function diversifyBySeller(ranked: RankedReel[], limit: number) {
  const pool = [...ranked];
  const result: RankedReel[] = [];
  const sellerCounts = new Map<string, number>();
  const maxPerSeller = Math.max(2, Math.ceil(limit * 0.3));

  while (pool.length > 0 && result.length < limit) {
    const previousSeller = result.length ? result[result.length - 1].r.sellerId : undefined;
    let pickIndex = 0;
    const lookahead = Math.min(SAME_SELLER_LOOKAHEAD, pool.length);

    for (let i = 0; i < lookahead; i += 1) {
      const seller = pool[i].r.sellerId;
      const alreadyShown = seller ? sellerCounts.get(seller) ?? 0 : 0;
      if (seller && alreadyShown >= maxPerSeller && !pool[i].r.pinned) continue;
      if (seller && previousSeller === seller && !pool[i].r.pinned) continue;
      pickIndex = i;
      break;
    }

    const [picked] = pool.splice(pickIndex, 1);
    result.push(picked);
    if (picked.r.sellerId) {
      sellerCounts.set(picked.r.sellerId, (sellerCounts.get(picked.r.sellerId) ?? 0) + 1);
    }
  }

  return result;
}

export const list = query({
  args: { userId: v.optional(v.id('users')), limit: v.optional(v.number()) },
  handler: async (ctx, { userId, limit }) => {
    const take = Math.max(1, Math.min(limit ?? 40, 80));
    const profile = await viewerProfile(ctx, userId);
    const now = Date.now();
    const rows = await ctx.db
      .query('reels')
      .withIndex('by_active_status', (q) => q.eq('active', true).eq('status', 'ready'))
      .order('desc')
      .take(Math.min(PUBLIC_REEL_CANDIDATE_LIMIT, take * 6));
    const ready = rows.filter(
      (r) =>
        !profile.hiddenReels.has(r._id) &&
        !(r.sellerId && profile.hiddenSellers.has(r.sellerId))
    );
    const hydrated = await Promise.all(
      ready.map(async (r) => {
        const likes = await countByReel(ctx, 'reelLikes', r._id);
        const comments = await countByReel(ctx, 'reelComments', r._id);
        const saves = await countByReel(ctx, 'reelSaves', r._id);
        const counts = { likes, comments, saves };
        return { r, counts, score: scoreReel(r, counts, profile, now) };
      })
    );
    const ranked = hydrated
      .sort((a, b) => b.score - a.score || b.r.createdAt - a.r.createdAt)
      .slice(0, take * 3);
    const sorted = diversifyBySeller(ranked, take)
      .map((x) => x.r);
    return Promise.all(sorted.map((r) => withUrls(ctx, r, userId)));
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query('reels').collect();
    const sorted = rows.sort((a, b) => b.createdAt - a.createdAt);
    return Promise.all(sorted.map((r) => withUrls(ctx, r)));
  },
});

export const bySeller = query({
  args: {
    sellerId: v.id('users'),
    userId: v.optional(v.id('users')),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { sellerId, userId, limit }) => {
    const profile = await viewerProfile(ctx, userId);
    const rows = await ctx.db
      .query('reels')
      .withIndex('by_seller_status_active', (q) =>
        q.eq('sellerId', sellerId).eq('status', 'ready').eq('active', true)
      )
      .order('desc')
      .take(Math.max(12, Math.min(limit ?? 12, 40) * 3));
    const ready = rows
      .filter((r) => !profile.hiddenReels.has(r._id))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit ?? 12);
    return Promise.all(ready.map((r) => withUrls(ctx, r, userId)));
  },
});

export const likedByUser = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const rows = await ctx.db
      .query('reelLikes')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    const reels = await Promise.all(rows.map((row) => ctx.db.get(row.reelId)));
    const ready = reels
      .filter((r): r is Doc<'reels'> => !!r && r.status === 'ready' && r.active)
      .sort((a, b) => b.createdAt - a.createdAt);
    return Promise.all(ready.map((r) => withUrls(ctx, r, userId)));
  },
});

export const comments = query({
  args: { reelId: v.id('reels') },
  handler: async (ctx, { reelId }) => {
    const rows = await ctx.db
      .query('reelComments')
      .withIndex('by_reel', (q) => q.eq('reelId', reelId))
      .order('desc')
      .take(COMMENT_LIMIT);
    return rows.reverse();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    caption: v.optional(v.string()),
    sellerId: v.optional(v.id('users')),
    listingId: v.optional(v.id('listings')),
    category: v.optional(v.string()),
    city: v.optional(v.string()),
    price: v.optional(v.string()),
    videoId: v.optional(v.id('_storage')),
    thumbId: v.optional(v.id('_storage')),
    hlsUrl: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    duration: v.optional(v.number()),
    videoProvider: v.optional(
      v.union(
        v.literal('convex'),
        v.literal('cloudflare'),
        v.literal('mux'),
        v.literal('bunny')
      )
    ),
    providerVideoId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.videoId && !args.hlsUrl) throw new Error('Video kerak');
    const all = await ctx.db.query('reels').collect();
    const order = all.reduce((max, r) => Math.max(max, r.order), -1) + 1;
    return await ctx.db.insert('reels', {
      title: args.title.trim(),
      caption: args.caption?.trim() || undefined,
      sellerId: args.sellerId,
      listingId: args.listingId,
      category: args.category?.trim() || undefined,
      city: args.city?.trim() || undefined,
      price: args.price?.trim() || undefined,
      videoId: args.videoId,
      thumbId: args.thumbId,
      hlsUrl: args.hlsUrl?.trim() || undefined,
      thumbnailUrl: args.thumbnailUrl?.trim() || undefined,
      duration: args.duration,
      videoProvider: args.videoProvider ?? (args.hlsUrl ? undefined : 'convex'),
      providerVideoId: args.providerVideoId?.trim() || undefined,
      status: 'ready',
      active: true,
      order,
      views: 0,
      watchMs: 0,
      threeSecondViews: 0,
      halfViews: 0,
      completions: 0,
      replays: 0,
      quickSkips: 0,
      chatTaps: 0,
      callTaps: 0,
      createdAt: Date.now(),
    });
  },
});

export const setStatus = mutation({
  args: { id: v.id('reels'), status: reelStatus },
  handler: (ctx, { id, status }) => ctx.db.patch(id, { status }),
});

export const setActive = mutation({
  args: { id: v.id('reels'), active: v.boolean() },
  handler: (ctx, { id, active }) => ctx.db.patch(id, { active }),
});

export const setPinned = mutation({
  args: { id: v.id('reels'), pinned: v.boolean() },
  handler: (ctx, { id, pinned }) => ctx.db.patch(id, { pinned }),
});

export const remove = mutation({
  args: { id: v.id('reels') },
  handler: async (ctx, { id }) => {
    const reel = await ctx.db.get(id);
    if (!reel) return;
    const likes = await ctx.db
      .query('reelLikes')
      .withIndex('by_reel', (q) => q.eq('reelId', id))
      .collect();
    const saves = await ctx.db
      .query('reelSaves')
      .withIndex('by_reel', (q) => q.eq('reelId', id))
      .collect();
    const comments = await ctx.db
      .query('reelComments')
      .withIndex('by_reel', (q) => q.eq('reelId', id))
      .collect();
    for (const row of [...likes, ...saves, ...comments]) await ctx.db.delete(row._id);
    if (reel.videoId) await ctx.storage.delete(reel.videoId).catch(() => {});
    if (reel.thumbId) await ctx.storage.delete(reel.thumbId).catch(() => {});
    await ctx.db.delete(id);
  },
});

export const toggleLike = mutation({
  args: { userId: v.id('users'), reelId: v.id('reels') },
  handler: async (ctx, { userId, reelId }) => {
    await enforceRateLimit(ctx, 'reelReactionUser', `${userId}:like`);
    const existing = await ctx.db
      .query('reelLikes')
      .withIndex('by_user_reel', (q) => q.eq('userId', userId).eq('reelId', reelId))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
      return false;
    }
    await ctx.db.insert('reelLikes', { userId, reelId, createdAt: Date.now() });
    return true;
  },
});

export const toggleSave = mutation({
  args: { userId: v.id('users'), reelId: v.id('reels') },
  handler: async (ctx, { userId, reelId }) => {
    await enforceRateLimit(ctx, 'reelReactionUser', `${userId}:save`);
    const existing = await ctx.db
      .query('reelSaves')
      .withIndex('by_user_reel', (q) => q.eq('userId', userId).eq('reelId', reelId))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
      return false;
    }
    await ctx.db.insert('reelSaves', { userId, reelId, createdAt: Date.now() });
    return true;
  },
});

export const addComment = mutation({
  args: {
    reelId: v.id('reels'),
    userId: v.optional(v.id('users')),
    userName: v.string(),
    text: v.string(),
  },
  handler: async (ctx, { reelId, userId, userName, text }) => {
    await enforceRateLimit(ctx, 'reelCommentUser', userId ?? `anon:${userName}`);
    await enforceRateLimit(ctx, 'reelCommentTarget', reelId);
    const clean = text.trim();
    if (!clean) throw new Error('Izoh bosh bolmasin');
    return await ctx.db.insert('reelComments', {
      reelId,
      userId,
      userName: userName.trim() || 'Foydalanuvchi',
      text: clean.slice(0, 500),
      createdAt: Date.now(),
    });
  },
});

export const recordView = mutation({
  args: { reelId: v.id('reels') },
  handler: async (ctx, { reelId }) => {
    await enforceRateLimit(ctx, 'reelView', reelId);
    const reel = await ctx.db.get(reelId);
    if (!reel) return;
    await ctx.db.patch(reelId, { views: reel.views + 1 });
  },
});

export const recordWatch = mutation({
  args: {
    reelId: v.id('reels'),
    ms: v.number(),
    durationMs: v.optional(v.number()),
    replayed: v.optional(v.boolean()),
  },
  handler: async (ctx, { reelId, ms, durationMs, replayed }) => {
    await enforceRateLimit(ctx, 'reelWatch', reelId);
    const reel = await ctx.db.get(reelId);
    if (!reel || !Number.isFinite(ms) || ms <= 0) return;
    const cappedMs = Math.min(ms, 120_000);
    const duration = Number.isFinite(durationMs) && durationMs && durationMs > 0
      ? durationMs
      : reel.duration
        ? reel.duration * 1000
        : undefined;
    const patches: Partial<Doc<'reels'>> = {
      watchMs: reel.watchMs + cappedMs,
    };
    if (cappedMs >= 3_000) patches.threeSecondViews = (reel.threeSecondViews ?? 0) + 1;
    if (duration && cappedMs >= duration * 0.5) patches.halfViews = (reel.halfViews ?? 0) + 1;
    if (duration && cappedMs >= duration * 0.85) patches.completions = (reel.completions ?? 0) + 1;
    if (duration && cappedMs < Math.min(2_000, duration * 0.15)) patches.quickSkips = (reel.quickSkips ?? 0) + 1;
    if (replayed) patches.replays = (reel.replays ?? 0) + 1;
    await ctx.db.patch(reelId, patches);
  },
});

export const hideForUser = mutation({
  args: {
    userId: v.id('users'),
    reelId: v.id('reels'),
    sellerId: v.optional(v.id('users')),
    scope: v.union(v.literal('reel'), v.literal('seller')),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { userId, reelId, sellerId, scope, reason }) => {
    const existing = scope === 'seller' && sellerId
      ? await ctx.db
          .query('reelHidden')
          .withIndex('by_user_seller', (q) => q.eq('userId', userId).eq('sellerId', sellerId))
          .first()
      : await ctx.db
          .query('reelHidden')
          .withIndex('by_user_reel', (q) => q.eq('userId', userId).eq('reelId', reelId))
          .first();
    if (existing) return existing._id;
    return ctx.db.insert('reelHidden', {
      userId,
      reelId: scope === 'reel' ? reelId : undefined,
      sellerId: scope === 'seller' ? sellerId : undefined,
      reason,
      createdAt: Date.now(),
    });
  },
});

export const recordTap = mutation({
  args: { reelId: v.id('reels'), kind: v.union(v.literal('chat'), v.literal('call')) },
  handler: async (ctx, { reelId, kind }) => {
    await enforceRateLimit(ctx, 'reelTap', `${kind}:${reelId}`);
    const reel = await ctx.db.get(reelId);
    if (!reel) return;
    await ctx.db.patch(
      reelId,
      kind === 'chat'
        ? { chatTaps: reel.chatTaps + 1 }
        : { callTaps: reel.callTaps + 1 }
    );
  },
});
