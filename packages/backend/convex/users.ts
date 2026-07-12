import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { userStatus } from './schema';
import { computeSellerTrust } from './trust';

const HEARTBEAT_WRITE_MS = 2 * 60 * 1000;
const accountKind = v.union(
  v.literal('personal'),
  v.literal('business'),
  v.literal('farm'),
  v.literal('dealer')
);
const approvalStatus = v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected'));

function officialKindForAccount(kind: 'personal' | 'business' | 'farm' | 'dealer') {
  if (kind === 'farm') return 'farmer' as const;
  if (kind === 'dealer') return 'dealer' as const;
  return undefined;
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

export const accountSwitcher = query({
  args: { ownerId: v.id('users'), activeId: v.optional(v.id('users')) },
  handler: async (ctx, { ownerId, activeId }) => {
    const owner = await ctx.db.get(ownerId);
    if (!owner) return [];
    const memberships = await ctx.db
      .query('accountMemberships')
      .withIndex('by_owner', (q) => q.eq('ownerId', ownerId))
      .collect();
    const accountIds = [ownerId, ...memberships.map((m) => m.accountId)].filter(
      (id, index, arr) => arr.findIndex((x) => x === id) === index
    );
    const accounts = await Promise.all(
      accountIds.map(async (id) => {
        const user = await ctx.db.get(id);
        if (!user) return null;
        const membership = memberships.find((m) => m.accountId === id);
        const listings = await ctx.db
          .query('listings')
          .withIndex('by_owner', (q) => q.eq('ownerId', id))
          .collect();
        const avatarUrl = user.avatar ? await ctx.storage.getUrl(user.avatar) : null;
        return {
          _id: user._id,
          name: user.name,
          phone: user.phone,
          avatarUrl,
          role: membership?.role ?? 'owner',
          kind: membership?.kind ?? 'personal',
          label: membership?.label ?? 'Shaxsiy profil',
          approvalStatus: membership?.approvalStatus ?? (membership?.kind === 'farm' || membership?.kind === 'dealer' ? 'pending' : 'approved'),
          isActive: (activeId ?? ownerId) === id,
          listingsCount: listings.length,
          activeListingsCount: listings.filter((l) => l.status === 'active').length,
          isDealer: !!user.isDealer,
          verified: !!(user.verifiedAt || user.telegramId),
        };
      })
    );
    return accounts.filter((x): x is NonNullable<typeof x> => x !== null);
  },
});

export const createLinkedAccount = mutation({
  args: {
    ownerId: v.id('users'),
    name: v.string(),
    kind: accountKind,
    label: v.optional(v.string()),
  },
  handler: async (ctx, { ownerId, name, kind, label }) => {
    const owner = await ctx.db.get(ownerId);
    if (!owner) throw new Error('Asosiy profil topilmadi');
    const cleanedName = name.trim() || (kind === 'farm' ? 'Ferma profili' : kind === 'dealer' ? 'Diler profili' : 'Sotuvchi profili');
    const needsApproval = kind === 'farm' || kind === 'dealer';
    const officialKind = officialKindForAccount(kind);
    const accountId = await ctx.db.insert('users', {
      name: cleanedName,
      phone: owner.phone,
      listings: 0,
      joined: new Date().toLocaleDateString('ru-RU'),
      status: 'active',
      bio:
        kind === 'farm'
          ? 'Ferma profili'
          : kind === 'dealer'
            ? 'Diler profili'
            : kind === 'business'
              ? 'Sotuvchi profili'
              : undefined,
      officialKind,
      officialStatus: needsApproval ? 'pending' : 'approved',
    });
    await ctx.db.insert('accountMemberships', {
      ownerId,
      accountId,
      role: 'owner',
      kind,
      label: label?.trim() || (kind === 'farm' ? 'Ferma' : kind === 'dealer' ? 'Diler' : 'Sotuvchi'),
      approvalStatus: needsApproval ? 'pending' : 'approved',
      createdAt: Date.now(),
    });
    return accountId;
  },
});

export const accountApprovalRequests = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query('accountMemberships').collect();
    const requests = rows.filter((m) => m.kind === 'farm' || m.kind === 'dealer');
    const hydrated = await Promise.all(
      requests.map(async (m) => {
        const account = await ctx.db.get(m.accountId);
        const owner = await ctx.db.get(m.ownerId);
        if (!account || !owner) return null;
        const listings = await ctx.db
          .query('listings')
          .withIndex('by_owner', (q) => q.eq('ownerId', m.accountId))
          .collect();
        return {
          _id: m._id,
          ownerId: m.ownerId,
          accountId: m.accountId,
          kind: m.kind,
          label: m.label,
          approvalStatus: m.approvalStatus ?? 'pending',
          createdAt: m.createdAt,
          reviewedAt: m.reviewedAt,
          accountName: account.name,
          phone: account.phone,
          ownerName: owner.name,
          listingsCount: listings.length,
          isDealer: !!account.isDealer,
          officialKind: account.officialKind,
          officialStatus: account.officialStatus,
        };
      })
    );
    return hydrated
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => {
        const order = { pending: 0, approved: 1, rejected: 2 } as const;
        return order[a.approvalStatus] - order[b.approvalStatus] || b.createdAt - a.createdAt;
      });
  },
});

export const setAccountApproval = mutation({
  args: {
    membershipId: v.id('accountMemberships'),
    status: approvalStatus,
    officialKind: v.optional(v.union(v.literal('farmer'), v.literal('dealer'), v.literal('big_player'))),
  },
  handler: async (ctx, { membershipId, status, officialKind }) => {
    const membership = await ctx.db.get(membershipId);
    if (!membership) throw new Error('Soʻrov topilmadi');
    const nextKind = officialKind ?? officialKindForAccount(membership.kind);
    await ctx.db.patch(membershipId, {
      approvalStatus: status,
      reviewedAt: Date.now(),
    });
    await ctx.db.patch(membership.accountId, {
      officialKind: status === 'approved' ? nextKind : nextKind,
      officialStatus: status,
      isDealer: status === 'approved' && nextKind === 'dealer',
    });
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
    const avatarUrl = u.avatar ? await ctx.storage.getUrl(u.avatar) : null;
    const now = nowArg ?? Date.now();
    const dealerRows = u.isDealer
      ? await ctx.db
          .query('dealers')
          .withIndex('by_user', (q) => q.eq('userId', id))
          .collect()
      : [];
    const dealerShowcase =
      dealerRows
        .filter((d) => d.active)
        .sort((a, b) => a.order - b.order)[0] ??
      dealerRows.sort((a, b) => b.createdAt - a.createdAt)[0] ??
      null;
    const dealerVideoUrl = dealerShowcase ? await ctx.storage.getUrl(dealerShowcase.videoId) : null;
    const dealerThumbUrl = dealerShowcase?.thumbId
      ? await ctx.storage.getUrl(dealerShowcase.thumbId)
      : null;
    const trust = computeSellerTrust(u, { reportCount: reports.length, now });
    return {
      _id: u._id,
      name: u.name,
      phone: u.phone,
      phoneVerified: trust.phoneVerified,
      telegramLinked: trust.telegramLinked,
      isDealer: trust.isDealer,
      activeRecently: trust.activeRecently,
      noReports: trust.noReports,
      goodReviews: trust.goodReviews,
      verified: trust.verified,
      verifiedAt: u.verifiedAt,
      reportCount: trust.reportCount,
      bio: u.bio ?? '',
      joined: u.joined,
      avatarUrl,
      rating: trust.rating,
      ratingCount: trust.ratingCount,
      activeCount: active,
      soldCount: sold,
      followerCount: followers.length,
      lastSeen: u.lastSeen,
      online: trust.online,
      dealerAddress: u.dealerAddress ?? '',
      dealerHours: u.dealerHours ?? '',
      dealerMapUrl: u.dealerMapUrl ?? '',
      dealerShowcase: dealerShowcase
        ? {
            _id: dealerShowcase._id,
            title: dealerShowcase.title,
            dealer: dealerShowcase.dealer ?? u.name,
            videoUrl: dealerVideoUrl,
            thumbUrl: dealerThumbUrl,
          }
        : null,
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
  handler: (ctx, { id, isDealer }) =>
    ctx.db.patch(id, {
      isDealer,
      officialKind: isDealer ? 'dealer' : undefined,
      officialStatus: isDealer ? 'approved' : undefined,
    }),
});

/** Admin-managed public details for official dealer profiles. */
export const updateDealerProfile = mutation({
  args: {
    id: v.id('users'),
    dealerAddress: v.optional(v.string()),
    dealerHours: v.optional(v.string()),
    dealerMapUrl: v.optional(v.string()),
  },
  handler: async (ctx, { id, dealerAddress, dealerHours, dealerMapUrl }) => {
    const patch: Record<string, unknown> = {};
    if (dealerAddress !== undefined) patch.dealerAddress = dealerAddress.trim();
    if (dealerHours !== undefined) patch.dealerHours = dealerHours.trim();
    if (dealerMapUrl !== undefined) patch.dealerMapUrl = dealerMapUrl.trim();
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id('users') },
  handler: (ctx, { id }) => ctx.db.delete(id),
});
