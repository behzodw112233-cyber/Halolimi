import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export const listingStatus = v.union(
  v.literal('active'),
  v.literal('pending'),
  v.literal('rejected')
);

export const adStatus = v.union(
  v.literal('active'),
  v.literal('paused'),
  v.literal('ended')
);

export const listingTier = v.union(
  v.literal('alo'),
  v.literal('zor'),
  v.literal('vip'),
  v.literal('lux')
);

export const userStatus = v.union(v.literal('active'), v.literal('blocked'));
export const reportStatus = v.union(v.literal('new'), v.literal('resolved'));
export const paymentStatus = v.union(v.literal('success'), v.literal('pending'));

export default defineSchema({
  categories: defineTable({
    slug: v.string(),
    name: v.string(),
    emoji: v.string(),
    order: v.number(),
    active: v.boolean(),
  }).index('by_slug', ['slug']),

  listings: defineTable({
    title: v.string(),
    price: v.string(),
    category: v.string(), // category slug
    city: v.string(),
    phone: v.string(),
    specs: v.array(v.object({ label: v.string(), value: v.string() })),
    desc: v.string(),
    status: listingStatus,
    sellerName: v.string(),
    ownerId: v.optional(v.id('users')),
    photos: v.optional(v.array(v.id('_storage'))),
    createdAt: v.number(),
    // Feed ranking: promotion tier + when its boost expires, and manual admin pin.
    tier: v.optional(listingTier),
    boostedUntil: v.optional(v.number()),
    pinned: v.optional(v.boolean()),
    // Manual admin feed priority. Higher = pushed further up. Set from the
    // admin Feed page (drag-to-reorder writes this too). 0/undefined = algorithm only.
    feedBoost: v.optional(v.number()),
  })
    .index('by_category', ['category'])
    .index('by_status', ['status'])
    .index('by_owner', ['ownerId']),

  ads: defineTable({
    advertiser: v.string(),
    emoji: v.string(),
    grad: v.array(v.string()),
    headline: v.string(),
    body: v.string(),
    cta: v.string(),
    url: v.string(),
    placements: v.array(v.string()), // 'app' | 'bot'
    status: adStatus,
    budget: v.number(),
    spent: v.number(),
    impressions: v.number(),
    clicks: v.number(),
    start: v.string(),
    end: v.string(),
  }).index('by_status', ['status']),

  users: defineTable({
    name: v.string(),
    phone: v.string(),
    listings: v.number(),
    joined: v.string(),
    status: userStatus,
  }).index('by_phone', ['phone']),

  messages: defineTable({
    threadId: v.string(),
    senderId: v.optional(v.id('users')),
    senderName: v.string(),
    text: v.string(),
    createdAt: v.number(),
  }).index('by_thread', ['threadId']),

  saved: defineTable({
    userId: v.id('users'),
    listingId: v.id('listings'),
  })
    .index('by_user', ['userId'])
    .index('by_user_listing', ['userId', 'listingId']),

  // Single-row platform configuration, controlled from the admin Sozlamalar page.
  settings: defineTable({
    platformName: v.string(),
    currency: v.string(), // 'UZS' | 'USD'
    language: v.string(), // 'uz' | 'ru'
    autoApprove: v.boolean(),
    allowNoPhoto: v.boolean(),
    notifyNewListing: v.boolean(),
    payme: v.boolean(),
    click: v.boolean(),
    uzcard: v.boolean(),
    // Feed algorithm knobs (admin-tunable).
    feedRecencyWeight: v.optional(v.number()),
    feedPromoWeight: v.optional(v.number()),
    feedBoostDays: v.optional(v.number()),
  }),

  notifications: defineTable({
    icon: v.string(),
    title: v.string(),
    body: v.string(),
    createdAt: v.number(),
  }),

  // Short-lived login handshakes. The app creates a pending row keyed by a random
  // token, opens the Telegram bot with that token, and the bot marks it verified
  // (attaching the user) once the person shares their contact. The app polls by token.
  authSessions: defineTable({
    token: v.string(),
    status: v.union(v.literal('pending'), v.literal('verified')),
    userId: v.optional(v.id('users')),
    createdAt: v.number(),
  }).index('by_token', ['token']),

  reports: defineTable({
    listingTitle: v.string(),
    reason: v.string(),
    reporter: v.string(),
    date: v.string(),
    status: reportStatus,
  }).index('by_status', ['status']),

  payments: defineTable({
    user: v.string(),
    type: v.string(),
    method: v.string(),
    amount: v.string(),
    date: v.string(),
    status: paymentStatus,
  }),
});
