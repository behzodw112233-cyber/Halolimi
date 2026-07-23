import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import type { Doc } from './_generated/dataModel';
import { internal } from './_generated/api';
import { createForUser } from './notifications';
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { listingStatus, listingTier } from './schema';
import { computeSellerTrust } from './trust';

// Relative promotion strength per tier (multiplied by the admin promo weight).
const TIER_WEIGHT: Record<string, number> = { alo: 1, zor: 2, vip: 4, lux: 8 };
const DAY_MS = 24 * 60 * 60 * 1000;
const RELATED_SCAN_LIMIT = 32;
const RECOMMENDATION_SCAN_LIMIT = 160;
const AI_RECOMMENDATION_SCAN_LIMIT = 180;
const RAISING_CATEGORIES = ['cattle', 'sheep', 'poultry', 'rabbits'];
const PRICE_SAMPLE_LIMIT = 120;
const PRICE_INTEL_TTL_MS = 6 * 60 * 60 * 1000;
type PriceIntelCtx = QueryCtx | MutationCtx;
type PriceIntelStatus = 'below_market' | 'good_price' | 'high_price';

/** Attach resolved, servable image URLs from the listing's storage ids. */
async function withUrls(ctx: QueryCtx, l: Doc<'listings'>) {
  const urls = l.photos
    ? await Promise.all(l.photos.map((id) => ctx.storage.getUrl(id)))
    : [];
  return { ...l, photoUrls: urls.filter((u): u is string => u !== null) };
}

/** Feed/search cards only need the first image, but still show a real count. */
async function withPreviewUrl(ctx: QueryCtx, l: Doc<'listings'>) {
  const first = l.photos?.[0] ? await ctx.storage.getUrl(l.photos[0]) : null;
  let sellerTrust = null;
  if (l.ownerId) {
    const seller = await ctx.db.get(l.ownerId);
    if (seller) {
      const reports = await ctx.db
        .query('reports')
        .withIndex('by_seller', (q) => q.eq('sellerId', l.ownerId))
        .collect();
      sellerTrust = computeSellerTrust(seller, { reportCount: reports.length });
    }
  }
  return {
    ...l,
    photoUrls: first ? [first] : [],
    photoCount: l.photos?.length ?? 0,
    sellerTrust,
  };
}

// A manual feed priority point outweighs any algorithm signal, so the admin's
// hand-picked order (drag / priority number) is authoritative, while promo +
// recency still break ties among listings with the same manual priority.
const MANUAL_WEIGHT = 100_000;

/**
 * Feed score for a listing (v2). Higher ranks first.
 *
 * Signals (in priority order):
 *  0. Admin pin → forced top
 *  1. Admin feedBoost (manual priority) → dominates
 *  2. Recency (exponential decay over feedDecayDays)
 *  3. Promotion tier boost
 *  4. Engagement: views per day since creation (capped)
 *  5. Seller trust: verified, dealer, rating
 *  6. Photo quality: more photos = higher score (capped at 5)
 *
 * Diversity penalty is applied AFTER scoring (see applyDiversity).
 */
function feedScore(
  l: Doc<'listings'>,
  seller: {
    verified: boolean;
    isDealer: boolean;
    rating: number;
    ratingCount: number;
  } | null,
  now: number,
  w: {
    recencyWeight: number;
    promoWeight: number;
    engagementWeight: number;
    trustWeight: number;
    photoWeight: number;
    decayDays: number;
  }
) {
  const ageDays = (now - l.createdAt) / DAY_MS;

  // 0 + 1. Admin overrides (pin + manual feedBoost)
  const adminScore =
    (l.pinned ? 1_000_000_000 : 0) +
    (l.feedBoost ?? 0) * MANUAL_WEIGHT;

  // 2. Recency: exponential decay over decayDays
  const halfLife = w.decayDays > 1 ? w.decayDays : 7;
  const recency = Math.exp(-ageDays / halfLife) * 1000 * w.recencyWeight;

  // 3. Promotion boost
  const boostActive = !!l.boostedUntil && l.boostedUntil > now;
  const promo = boostActive && l.tier
    ? TIER_WEIGHT[l.tier] * 10 * w.promoWeight
    : 0;

  // 4. Engagement: views per day since creation, capped
  const views = l.views ?? 0;
  const viewsPerDay = ageDays > 0.1 ? views / ageDays : views;
  const engagement = Math.min(viewsPerDay, 50) * w.engagementWeight;

  // 5. Seller trust signals
  let trust = 0;
  if (seller?.verified) trust += 1.5 * w.trustWeight;
  if (seller?.isDealer) trust += 1.0 * w.trustWeight;
  if (seller && seller.ratingCount > 0) {
    trust += (Math.min(seller.rating, 5) / 5) * w.trustWeight;
  }

  // 6. Photo quality: each photo adds, capped at 5
  const photoCount = l.photos?.length ?? 0;
  const photoScore = Math.min(photoCount, 5) * w.photoWeight;

  return adminScore + recency + promo + engagement + trust + photoScore;
}

/**
 * Apply diversity penalty: each listing from the same seller beyond the first
 * loses `penalty` points per duplicate. This prevents one seller from
 * dominating the feed.
 */
function applyDiversity<T extends { l: Doc<'listings'>; score: number }>(
  ranked: T[],
  penalty: number
): T[] {
  if (penalty <= 0 || ranked.length < 2) return ranked;
  const ownerCount = new Map<string, number>();
  return ranked.map((item) => {
    if (item.l.ownerId) {
      const count = ownerCount.get(item.l.ownerId) ?? 0;
      ownerCount.set(item.l.ownerId, count + 1);
      if (count > 0) {
        return { ...item, score: item.score - penalty * count };
      }
    }
    return item;
  });
}

/** Build seller lookup map for all active listings in a batch. */
async function buildSellerMap(
  ctx: QueryCtx,
  listings: Doc<'listings'>[]
): Promise<
  Map<
    string,
    { verified: boolean; isDealer: boolean; rating: number; ratingCount: number }
  >
> {
  const ids = [
    ...new Set(
      listings
        .map((l) => l.ownerId)
        .filter((id): id is NonNullable<typeof id> => id !== null)
    ),
  ];
  if (ids.length === 0) return new Map();
  const users = await Promise.all(ids.map((id) => ctx.db.get(id)));
  const map = new Map<
    string,
    { verified: boolean; isDealer: boolean; rating: number; ratingCount: number }
  >();
  users.forEach((u, i) => {
    if (u) {
      map.set(ids[i], {
        verified: !!(u.verifiedAt || u.telegramId),
        isDealer: !!u.isDealer,
        rating: u.ratingCount ? (u.ratingSum ?? 0) / u.ratingCount : 0,
        ratingCount: u.ratingCount ?? 0,
      });
    }
  });
  return map;
}

/** Resolve feed weights from settings (or defaults). */
async function feedWeights(ctx: QueryCtx) {
  const s = await ctx.db.query('settings').first();
  return {
    recencyWeight: s?.feedRecencyWeight ?? 1,
    promoWeight: s?.feedPromoWeight ?? 1,
    engagementWeight: s?.feedEngagementWeight ?? 100,
    trustWeight: s?.feedTrustWeight ?? 100,
    photoWeight: s?.feedPhotoWeight ?? 40,
    diversityPenalty: s?.feedDiversityPenalty ?? 200,
    decayDays: s?.feedDecayDays ?? 7,
    batchSize: s?.feedBatchSize ?? 200,
  };
}

/** Great-circle distance in km between two coordinates (for "Yaqin atrofda"). */
function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function numberFromText(value?: string) {
  if (!value) return null;
  const digits = value.replace(/[^\d]/g, '');
  return digits ? Number(digits) : null;
}

function normalized(value?: string) {
  return (value ?? '').trim().toLowerCase();
}

function specValue(l: Doc<'listings'>, key: string) {
  const target = normalized(key);
  return l.specs.find((s) => normalized(s.label).includes(target))?.value ?? '';
}

function currencyFromText(value?: string) {
  const text = normalized(value);
  if (text.includes('y.e') || text.includes('usd') || text.includes('$')) return 'usd';
  return 'uzs';
}

function aiReasonChips({
  l,
  price,
  wanted,
  budgetMax,
  raisingGoal,
  score,
}: {
  l: Doc<'listings'>;
  price: number | null;
  wanted: Set<string>;
  budgetMax?: number;
  raisingGoal: boolean;
  score: number;
}) {
  const reasons = [
    wanted.size === 0 || wanted.has(l.category) ? 'Turiga mos' : null,
    budgetMax !== undefined && price !== null && price <= budgetMax ? 'Budjetga mos' : null,
    raisingGoal && RAISING_CATEGORIES.includes(l.category) ? 'Boqishga mos' : null,
    l.photos?.length ? 'Rasmi bor' : null,
    l.ownerId ? 'Sotuvchi bor' : null,
  ].filter((x): x is string => !!x);

  return {
    aiReasons: reasons.slice(0, 4),
    aiScore: Math.round(score),
  };
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function priceBasis({ sameBreed, closeWeight }: { sameBreed: boolean; closeWeight: boolean }) {
  if (sameBreed && closeWeight) return 'Bir xil zot va vaznga yaqin eʼlonlar bilan solishtirildi';
  if (sameBreed) return 'Bir xil zotdagi eʼlonlar bilan solishtirildi';
  if (closeWeight) return 'Vazni yaqin eʼlonlar bilan solishtirildi';
  return 'Shu kategoriyadagi eʼlonlar bilan solishtirildi';
}

async function buildPriceIntel(ctx: PriceIntelCtx, l: Doc<'listings'>) {
  const price = numberFromText(l.price);
  if (!price || price <= 0) return undefined;

  const currency = currencyFromText(l.price);
  const breed = normalized(specValue(l, 'zot'));
  const weight = numberFromText(specValue(l, 'vazn'));
  const rows = await ctx.db
    .query('listings')
    .withIndex('by_status_category', (q) =>
      q.eq('status', 'active').eq('category', l.category)
    )
    .order('desc')
    .take(PRICE_SAMPLE_LIMIT);

  const candidates = rows
    .filter((r) => r._id !== l._id && currencyFromText(r.price) === currency)
    .map((r) => {
      const otherPrice = numberFromText(r.price);
      if (!otherPrice || otherPrice <= 0) return null;
      const otherBreed = normalized(specValue(r, 'zot'));
      const otherWeight = numberFromText(specValue(r, 'vazn'));
      const sameBreed = !!breed && !!otherBreed && otherBreed === breed;
      const closeWeight =
        !!weight &&
        !!otherWeight &&
        Math.abs(otherWeight - weight) <= Math.max(25, weight * 0.25);
      return { price: otherPrice, sameBreed, closeWeight };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (candidates.length < 2) return undefined;

  let cohort = candidates.filter((c) => c.sameBreed && c.closeWeight);
  if (cohort.length < 2) cohort = candidates.filter((c) => c.sameBreed);
  if (cohort.length < 2) cohort = candidates.filter((c) => c.closeWeight);
  if (cohort.length < 2) cohort = candidates;

  const medianPrice = median(cohort.map((c) => c.price));
  if (!medianPrice) return undefined;
  const differencePct = Math.round(((price - medianPrice) / medianPrice) * 100);
  const status: PriceIntelStatus =
    differencePct <= -15
      ? 'below_market'
      : differencePct >= 15
        ? 'high_price'
        : 'good_price';

  return {
    status,
    medianPrice,
    sampleSize: cohort.length,
    differencePct,
    currency,
    basis: priceBasis({
      sameBreed: cohort.some((c) => c.sameBreed),
      closeWeight: cohort.some((c) => c.closeWeight),
    }),
    updatedAt: Date.now(),
  };
}

async function priceIntelForDetail(ctx: QueryCtx, l: Doc<'listings'>) {
  if (l.priceIntel && Date.now() - l.priceIntel.updatedAt < PRICE_INTEL_TTL_MS) {
    return l.priceIntel;
  }
  return await buildPriceIntel(ctx, l);
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

    const w = await feedWeights(ctx);
    const now = Date.now();
    const sellerMap = await buildSellerMap(ctx, filtered);

    let ranked = filtered.map((l) => {
      const seller = l.ownerId ? sellerMap.get(l.ownerId) ?? null : null;
      return { l, score: feedScore(l, seller, now, w) };
    });
    ranked.sort((a, b) => b.score - a.score || b.l.createdAt - a.l.createdAt);
    ranked = applyDiversity(ranked, w.diversityPenalty);

    return Promise.all(ranked.map((x) => withUrls(ctx, x.l)));
  },
});

export const listActivePage = query({
  args: {
    category: v.optional(v.string()),
    now: v.optional(v.number()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { category, now: nowArg, paginationOpts }) => {
    const w = await feedWeights(ctx);
    const now = nowArg ?? Date.now();

    // Fetch a large batch so in-memory re-ranking produces meaningful results.
    // The batch window slides forward by createdAt desc — each page call gets
    // the next `batchSize` newest listings, re-ranks them by score, and returns
    // only the top `requestedCount` from that window.
    const batchSize = Math.max(w.batchSize, paginationOpts.numItems);
    const modifiedOpts = { ...paginationOpts, numItems: batchSize };

    const pageResult = category
      ? await ctx.db
          .query('listings')
          .withIndex('by_status_category', (q) =>
            q.eq('status', 'active').eq('category', category)
          )
          .order('desc')
          .paginate(modifiedOpts)
      : await ctx.db
          .query('listings')
          .withIndex('by_status', (q) => q.eq('status', 'active'))
          .order('desc')
          .paginate(modifiedOpts);

    if (pageResult.page.length === 0) {
      return { ...pageResult, page: [] };
    }

    const sellerMap = await buildSellerMap(ctx, pageResult.page);

    let ranked = pageResult.page.map((l) => {
      const seller = l.ownerId ? sellerMap.get(l.ownerId) ?? null : null;
      return { l, score: feedScore(l, seller, now, w) };
    });
    ranked.sort((a, b) => b.score - a.score || b.l.createdAt - a.l.createdAt);
    ranked = applyDiversity(ranked, w.diversityPenalty);

    // Return only what the client requested, but keep the cursor pointing to
    // the end of the batch so the next call fetches the next window.
    const requestedCount = paginationOpts.numItems;
    const page = ranked.slice(0, requestedCount).map((x) => x.l);

    return {
      ...pageResult,
      page: await Promise.all(page.map((l) => withPreviewUrl(ctx, l))),
    };
  },
});

export const search = query({
  args: {
    q: v.optional(v.string()),
    category: v.optional(v.string()),
    city: v.optional(v.string()),
    breed: v.optional(v.string()),
    priceMin: v.optional(v.number()),
    priceMax: v.optional(v.number()),
    weightMin: v.optional(v.number()),
    weightMax: v.optional(v.number()),
    hasPhotos: v.optional(v.boolean()),
    minRating: v.optional(v.number()),
    // "Yaqin atrofda": buyer coordinates. When present, results are sorted by
    // real distance and each carries distanceKm.
    nearLat: v.optional(v.number()),
    nearLng: v.optional(v.number()),
    now: v.optional(v.number()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const pageResult = args.category
      ? await ctx.db
          .query('listings')
          .withIndex('by_status_category', (q) =>
            q.eq('status', 'active').eq('category', args.category!)
          )
          .order('desc')
          .paginate(args.paginationOpts)
      : await ctx.db
          .query('listings')
          .withIndex('by_status', (q) => q.eq('status', 'active'))
          .order('desc')
          .paginate(args.paginationOpts);
    const w = await feedWeights(ctx);
    const now = args.now ?? Date.now();

    const qText = normalized(args.q);
    const city = normalized(args.city);
    const breed = normalized(args.breed);

    // Build a single seller map for the entire batch — used for both
    // filtering (minRating) and scoring (feedScore).
    const searchSellers = await buildSellerMap(ctx, pageResult.page);

    const filtered = pageResult.page.filter((l) => {
      if (args.category && l.category !== args.category) return false;
      if (city && normalized(l.city) !== city) return false;
      if (args.hasPhotos && !l.photos?.length) return false;

      if (args.minRating !== undefined) {
        const seller = l.ownerId ? searchSellers.get(l.ownerId) : undefined;
        const sellerRating = seller?.ratingCount
          ? (seller.rating ?? 0)
          : 0;
        if (sellerRating < args.minRating) return false;
      }

      const price = numberFromText(l.price);
      if (args.priceMin !== undefined && (price === null || price < args.priceMin)) return false;
      if (args.priceMax !== undefined && (price === null || price > args.priceMax)) return false;

      const weight = numberFromText(specValue(l, 'vazn'));
      if (args.weightMin !== undefined && (weight === null || weight < args.weightMin)) return false;
      if (args.weightMax !== undefined && (weight === null || weight > args.weightMax)) return false;

      if (breed && !normalized(specValue(l, 'zot')).includes(breed)) return false;

      if (qText) {
        const haystack = normalized(
          [
            l.title,
            l.desc,
            l.city,
            l.price,
            l.sellerName,
            ...l.specs.flatMap((s) => [s.label, s.value]),
          ].join(' ')
        );
        if (!haystack.includes(qText)) return false;
      }

      return true;
    });

    const near =
      args.nearLat !== undefined && args.nearLng !== undefined
        ? { lat: args.nearLat, lng: args.nearLng }
        : null;
    const distanceOf = (l: Doc<'listings'>) =>
      near && l.lat !== undefined && l.lng !== undefined
        ? haversineKm(near, { lat: l.lat, lng: l.lng })
        : null;

    let ranked = filtered
      .map((l) => {
        const haystack = normalized(
          [l.title, l.desc, l.city, l.price, ...l.specs.map((s) => s.value)].join(' ')
        );
        const textBonus = qText && haystack.includes(qText) ? 500 : 0;
        const categoryBonus = args.category && l.category === args.category ? 250 : 0;
        const cityBonus = city && normalized(l.city) === city ? 200 : 0;
        const seller = l.ownerId ? searchSellers.get(l.ownerId) ?? null : null;
        return {
          l,
          sellerRating: seller?.rating ?? 0,
          distanceKm: distanceOf(l),
          score:
            feedScore(l, seller, now, w) +
            textBonus +
            categoryBonus +
            cityBonus,
        };
      });

    // When the buyer asked for "nearby", sort by proximity first.
    // Otherwise sort by the full feed algorithm score.
    if (near) {
      ranked.sort((a, b) => {
        const da = a.distanceKm ?? Infinity;
        const db = b.distanceKm ?? Infinity;
        if (da !== db) return da - db;
        return b.score - a.score || b.l.createdAt - a.l.createdAt;
      });
    } else {
      ranked.sort((a, b) => b.score - a.score || b.l.createdAt - a.l.createdAt);
      ranked = applyDiversity(ranked, w.diversityPenalty);
    }

    return {
      ...pageResult,
      page: await Promise.all(
        ranked.map(async ({ l, sellerRating, distanceKm }) => ({
          ...(await withPreviewUrl(ctx, l)),
          sellerRating,
          distanceKm: distanceKm === null ? null : Math.round(distanceKm),
          boostActive: !!l.boostedUntil && l.boostedUntil > now,
        }))
      ),
    };
  },
});

export const botSearch = query({
  args: {
    category: v.optional(v.string()),
    city: v.optional(v.string()),
    priceMin: v.optional(v.number()),
    priceMax: v.optional(v.number()),
    hasPhotos: v.optional(v.boolean()),
    verifiedOnly: v.optional(v.boolean()),
    nearLat: v.optional(v.number()),
    nearLng: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const rows = args.category
      ? await ctx.db
          .query('listings')
          .withIndex('by_status_category', (q) =>
            q.eq('status', 'active').eq('category', args.category!)
          )
          .collect()
      : await ctx.db
          .query('listings')
          .withIndex('by_status', (q) => q.eq('status', 'active'))
          .collect();
    const near =
      args.nearLat !== undefined && args.nearLng !== undefined
        ? { lat: args.nearLat, lng: args.nearLng }
        : null;

    const hydrated = await Promise.all(
      rows.map(async (l) => {
        const seller = l.ownerId ? await ctx.db.get(l.ownerId) : null;
        const reports = l.ownerId
          ? await ctx.db
              .query('reports')
              .withIndex('by_seller', (q) => q.eq('sellerId', l.ownerId))
              .collect()
          : [];
        const trust = seller ? computeSellerTrust(seller, { reportCount: reports.length }) : null;
        const distanceKm =
          near && l.lat !== undefined && l.lng !== undefined
            ? haversineKm(near, { lat: l.lat, lng: l.lng })
            : null;
        return { l, trust, distanceKm };
      })
    );

    const filtered = hydrated.filter(({ l, trust }) => {
      if (args.city && normalized(l.city) !== normalized(args.city)) return false;
      if (args.hasPhotos && !l.photos?.length) return false;
      if (args.verifiedOnly && !trust?.verified) return false;
      const price = numberFromText(l.price);
      if (args.priceMin !== undefined && (price === null || price < args.priceMin)) return false;
      if (args.priceMax !== undefined && (price === null || price > args.priceMax)) return false;
      return true;
    });

    const take = Math.max(1, Math.min(args.limit ?? 20, 40));
    const sorted = filtered
      .sort((a, b) => {
        if (near) {
          const da = a.distanceKm ?? Infinity;
          const db = b.distanceKm ?? Infinity;
          if (da !== db) return da - db;
        }
        return b.l.createdAt - a.l.createdAt;
      })
      .slice(0, take);

    return Promise.all(
      sorted.map(async ({ l, distanceKm }) => ({
        ...(await withPreviewUrl(ctx, l)),
        distanceKm: distanceKm === null ? null : Math.round(distanceKm),
      }))
    );
  },
});

export const get = query({
  args: { id: v.id('listings'), now: v.optional(v.number()) },
  handler: async (ctx, { id, now: nowArg }) => {
    const l = await ctx.db.get(id);
    if (!l) return null;
    const seller = l.ownerId ? await ctx.db.get(l.ownerId) : null;
    const reports = l.ownerId
      ? await ctx.db
          .query('reports')
          .withIndex('by_seller', (q) => q.eq('sellerId', l.ownerId))
          .collect()
      : [];
    const now = nowArg ?? Date.now();
    const sellerTrust = seller
      ? computeSellerTrust(seller, { reportCount: reports.length, now })
      : null;
    return { ...(await withUrls(ctx, l)), sellerTrust, priceIntel: await priceIntelForDetail(ctx, l) };
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
    region: v.optional(v.string()),
    district: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
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
    const id = await ctx.db.insert('listings', { ...args, status, createdAt: Date.now() });
    const listing = await ctx.db.get(id);
    if (listing) {
      const priceIntel = await buildPriceIntel(ctx, listing);
      if (priceIntel) await ctx.db.patch(id, { priceIntel });
    }
    return id;
  },
});

export const refreshPriceIntel = mutation({
  args: { id: v.id('listings') },
  handler: async (ctx, { id }) => {
    const listing = await ctx.db.get(id);
    if (!listing) return null;
    const priceIntel = await buildPriceIntel(ctx, listing);
    await ctx.db.patch(id, { priceIntel });
    return priceIntel ?? null;
  },
});

export const setStatus = mutation({
  args: { id: v.id('listings'), status: listingStatus },
  handler: async (ctx, { id, status }) => {
    const l = await ctx.db.get(id);
    if (!l) return;
    await ctx.db.patch(id, { status });
    // Tell the owner when a moderation decision lands on their listing.
    if (l.ownerId && l.status !== status && (status === 'active' || status === 'rejected')) {
      const approved = status === 'active';
      await createForUser(ctx, {
        userId: l.ownerId,
        icon: approved ? 'checkmark-circle-outline' : 'alert-circle-outline',
        title: approved ? 'Eʼlon tasdiqlandi' : 'Eʼlon rad etildi',
        body: approved
          ? `"${l.title}" endi bozorda koʼrinadi.`
          : `"${l.title}" eʼloningiz tasdiqlanmadi.`,
        targetType: 'listing',
        targetId: id,
      });
      await ctx.scheduler.runAfter(0, internal.push.send, {
        userId: l.ownerId,
        title: approved ? 'Eʼlon tasdiqlandi ✅' : 'Eʼlon rad etildi',
        body: approved
          ? `"${l.title}" endi bozorda koʼrinadi.`
          : `"${l.title}" eʼloningiz tasdiqlanmadi.`,
        data: { type: 'listing', listingId: id },
      });
    }
  },
});

/** Count one detail-screen open. Best-effort — never blocks the screen. */
export const incrementViews = mutation({
  args: { id: v.id('listings') },
  handler: async (ctx, { id }) => {
    const l = await ctx.db.get(id);
    if (!l) return;
    const views = (l.views ?? 0) + 1;
    await ctx.db.patch(id, { views });
    if (l.ownerId && [10, 25, 50, 100, 250, 500, 1000].includes(views)) {
      await createForUser(ctx, {
        userId: l.ownerId,
        icon: 'eye-outline',
        title: `${views} ta ko‘rish`,
        body: `"${l.title}" eʼloningiz ${views} marta ko‘rildi.`,
        targetType: 'listing',
        targetId: id,
      });
    }
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
      .withIndex('by_status_category', (q) =>
        q.eq('status', 'active').eq('category', base.category)
      )
      .order('desc')
      .take(RELATED_SCAN_LIMIT);
    let pool = sameCat.filter((l) => l._id !== id);
    if (pool.length === 0) {
      const active = await ctx.db
        .query('listings')
        .withIndex('by_status', (q) => q.eq('status', 'active'))
        .order('desc')
        .take(RELATED_SCAN_LIMIT);
      pool = active.filter((l) => l._id !== id);
    }
    const ranked = pool.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit ?? 6);
    return Promise.all(ranked.map((l) => withPreviewUrl(ctx, l)));
  },
});

export const recommendations = query({
  args: {
    recentIds: v.optional(v.array(v.string())),
    savedIds: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
    now: v.optional(v.number()),
  },
  handler: async (ctx, { recentIds = [], savedIds = [], limit, now: nowArg }) => {
    const normalizeListingIds = (ids: string[]) =>
      ids
        .map((id) => ctx.db.normalizeId('listings', id))
        .filter((id): id is NonNullable<typeof id> => id !== null);
    const cleanRecentIds = normalizeListingIds(recentIds);
    const cleanSavedIds = normalizeListingIds(savedIds);
    const seen = new Set<string>();
    const signalIds = [...cleanRecentIds, ...cleanSavedIds].filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    if (signalIds.length === 0) return [];

    const signalRows = await Promise.all(signalIds.slice(0, 20).map((id) => ctx.db.get(id)));
    const signals = signalRows.filter((l): l is NonNullable<typeof l> => l !== null);
    if (signals.length === 0) return [];

    const categoryScores = new Map<string, number>();
    const cityScores = new Map<string, number>();
    const bump = (map: Map<string, number>, key: string, amount: number) => {
      map.set(key, (map.get(key) ?? 0) + amount);
    };

    cleanRecentIds.forEach((id, i) => {
      const l = signals.find((s) => s._id === id);
      if (!l) return;
      const weight = Math.max(1, 6 - i);
      bump(categoryScores, l.category, weight * 2);
      bump(cityScores, l.city, weight);
    });

    cleanSavedIds.forEach((id) => {
      const l = signals.find((s) => s._id === id);
      if (!l) return;
      bump(categoryScores, l.category, 5);
      bump(cityScores, l.city, 3);
    });

    const rows = await ctx.db
      .query('listings')
      .withIndex('by_status', (q) => q.eq('status', 'active'))
      .order('desc')
      .take(RECOMMENDATION_SCAN_LIMIT);
    const exclude = new Set(signalIds);
    const now = nowArg ?? Date.now();
    const take = Math.max(1, Math.min(limit ?? 8, 16));

    const ranked = rows
      .filter((l) => !exclude.has(l._id))
      .map((l) => {
        const ageDays = (now - l.createdAt) / DAY_MS;
        const recency = Math.max(0, 14 - ageDays) / 14;
        const promo = l.boostedUntil && l.boostedUntil > now ? 1 : 0;
        const score =
          (categoryScores.get(l.category) ?? 0) +
          (cityScores.get(l.city) ?? 0) +
          recency +
          promo;
        return { l, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || b.l.createdAt - a.l.createdAt)
      .slice(0, take)
      .map(({ l }) => l);

    return Promise.all(ranked.map((l) => withPreviewUrl(ctx, l)));
  },
});

export const aiRecommend = query({
  args: {
    categories: v.optional(v.array(v.string())),
    budgetMax: v.optional(v.number()),
    q: v.optional(v.string()),
    goal: v.optional(v.string()),
    limit: v.optional(v.number()),
    now: v.optional(v.number()),
  },
  handler: async (ctx, { categories = [], budgetMax, q, goal, limit, now: nowArg }) => {
    const rows = await ctx.db
      .query('listings')
      .withIndex('by_status', (x) => x.eq('status', 'active'))
      .order('desc')
      .take(AI_RECOMMENDATION_SCAN_LIMIT);
    const settings = await ctx.db.query('settings').first();
    const recencyWeight = settings?.feedRecencyWeight ?? 1;
    const promoWeight = settings?.feedPromoWeight ?? 1;
    const now = nowArg ?? Date.now();
    const wanted = new Set(categories.filter(Boolean));
    const qText = normalized(q);
    const take = Math.max(1, Math.min(limit ?? 8, 16));

    const raisingGoal = goal === 'raise_and_resell';
    const ranked = rows
      .filter((l) => {
        if (raisingGoal && !RAISING_CATEGORIES.includes(l.category)) return false;
        const price = numberFromText(l.price);
        if (budgetMax !== undefined && price !== null && price > budgetMax * 1.15) return false;
        return true;
      })
      .map((l) => {
        const price = numberFromText(l.price);
        const haystack = normalized(
          [l.title, l.desc, l.city, l.price, l.sellerName, ...l.specs.flatMap((s) => [s.label, s.value])].join(' ')
        );
        const categoryScore = wanted.size === 0 ? 80 : wanted.has(l.category) ? 900 : -900;
        const budgetScore =
          budgetMax === undefined
            ? 0
            : price === null
              ? -180
              : price <= budgetMax
                ? 500 + Math.max(0, 160 - Math.round(((budgetMax - price) / Math.max(budgetMax, 1)) * 160))
                : -Math.min(650, Math.round(((price - budgetMax) / Math.max(budgetMax, 1)) * 900));
        const textScore = qText
          ? qText
              .split(/\s+/)
              .filter((word) => word.length > 3)
              .reduce((sum, word) => sum + (haystack.includes(word) ? 60 : 0), 0)
          : 0;
        const raiseScore =
          raisingGoal
            ? ['cattle', 'sheep', 'poultry'].includes(l.category)
              ? 260
              : 120
            : 0;
        const trustScore = (l.photos?.length ? 60 : 0) + (l.ownerId ? 40 : 0);
        // Use a simplified feedScore without seller data since aiRecommend
        // already has its own comprehensive scoring logic.
        const feedPart = Math.min(250,
          (feedScore(l, null, now, {
            recencyWeight, promoWeight,
            engagementWeight: 100, trustWeight: 100, photoWeight: 40, decayDays: 7,
          }) / 1000));
        const score =
          feedPart +
          categoryScore +
          budgetScore +
          textScore +
          raiseScore +
          trustScore;
        return { l, score, price };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || b.l.createdAt - a.l.createdAt)
      .slice(0, take);

    return Promise.all(
      ranked.map(async ({ l, price, score }) => ({
        ...(await withPreviewUrl(ctx, l)),
        ...aiReasonChips({ l, price, wanted, budgetMax, raisingGoal, score }),
      }))
    );
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
    const boostedUntil = Date.now() + days * DAY_MS;
    await ctx.db.patch(id, { tier, boostedUntil });
    await ctx.scheduler.runAt(boostedUntil, internal.listings.notifyPromotionExpired, { id });
  },
});

export const notifyPromotionExpired = internalMutation({
  args: { id: v.id('listings') },
  handler: async (ctx, { id }) => {
    const l = await ctx.db.get(id);
    if (!l?.ownerId || !l.boostedUntil || l.boostedUntil > Date.now()) return;
    await createForUser(ctx, {
      userId: l.ownerId,
      icon: 'flash-off-outline',
      title: 'Reklama muddati tugadi',
      body: `"${l.title}" eʼloningizning ko‘tarish muddati tugadi.`,
      targetType: 'listing',
      targetId: id,
    });
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
    const w = await feedWeights(ctx);
    const now = Date.now();
    const sellerMap = await buildSellerMap(ctx, rows);
    const ranked = rows
      .map((l) => {
        const seller = l.ownerId ? sellerMap.get(l.ownerId) ?? null : null;
        return { l, score: feedScore(l, seller, now, w) };
      })
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
