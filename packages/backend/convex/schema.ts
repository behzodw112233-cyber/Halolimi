import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export const listingStatus = v.union(
  v.literal('active'),
  v.literal('pending'),
  v.literal('rejected'),
  v.literal('sold')
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
export const invoiceStatus = v.union(
  v.literal('pending'),
  v.literal('success'),
  v.literal('failed'),
  v.literal('cancelled')
);
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
    // Total detail-screen opens. Shown as the view counter; incremented on open.
    views: v.optional(v.number()),
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
    // Seller profile.
    avatar: v.optional(v.id('_storage')),
    bio: v.optional(v.string()),
    // Denormalized rating: running sum + count so the average is O(1) to show.
    ratingSum: v.optional(v.number()),
    ratingCount: v.optional(v.number()),
    // Number of listings the seller has marked sold (trust signal).
    soldCount: v.optional(v.number()),
    // Presence: last heartbeat time. "online" = within the last minute.
    lastSeen: v.optional(v.number()),
    // Wallet balance in UZS (soʻm), topped up via inPAY.
    balance: v.optional(v.number()),
  }).index('by_phone', ['phone']),

  // Buyer reviews of a seller (1–5 stars + optional text). One row per review.
  reviews: defineTable({
    sellerId: v.id('users'),
    authorId: v.optional(v.id('users')),
    authorName: v.string(),
    rating: v.number(), // 1..5
    text: v.string(),
    createdAt: v.number(),
  })
    .index('by_seller', ['sellerId'])
    .index('by_seller_author', ['sellerId', 'authorId']),

  // "Follow seller" edges. One row = follower follows seller.
  follows: defineTable({
    followerId: v.id('users'),
    sellerId: v.id('users'),
  })
    .index('by_follower', ['followerId'])
    .index('by_seller', ['sellerId'])
    .index('by_pair', ['followerId', 'sellerId']),

  messages: defineTable({
    threadId: v.string(),
    senderId: v.optional(v.id('users')),
    senderName: v.string(),
    text: v.string(),
    createdAt: v.number(),
    // Phase 3: rich messages.
    imageId: v.optional(v.id('_storage')), // image attachment
    replyToId: v.optional(v.id('messages')), // quoted message
    editedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()), // soft delete → "xabar oʻchirildi"
    reactions: v.optional(
      v.array(v.object({ userId: v.id('users'), emoji: v.string() }))
    ),
  }).index('by_thread', ['threadId']),

  // A conversation between two users (optionally about a listing). Identified by
  // a deterministic `key` so opening the same chat twice reuses one thread.
  threads: defineTable({
    key: v.string(),
    listingId: v.optional(v.id('listings')),
    title: v.string(),
    lastText: v.string(),
    lastAt: v.number(),
    lastSenderId: v.optional(v.id('users')),
  }).index('by_key', ['key']),

  // Per-user view of a thread: unread count, read cursor, typing signal, and the
  // display name of the counterpart from this member's perspective.
  threadMembers: defineTable({
    threadId: v.id('threads'),
    userId: v.id('users'),
    otherId: v.optional(v.id('users')),
    otherName: v.string(),
    unread: v.number(),
    lastReadAt: v.number(),
    typingUntil: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_thread', ['threadId'])
    .index('by_thread_user', ['threadId', 'userId']),

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

  // inPAY payment invoices. Created pending when the app requests a top-up,
  // flipped to success/failed when inPAY's webhook is verified server-side.
  invoices: defineTable({
    orderId: v.string(), // inPAY order_id
    userId: v.id('users'),
    amount: v.number(), // UZS
    purpose: v.string(), // 'topup' | 'promote'
    method: v.optional(v.string()), // click | payme | inPAY
    status: invoiceStatus,
    payUrl: v.optional(v.string()),
    transactionId: v.optional(v.number()),
    // Promotion target (purpose === 'promote').
    listingId: v.optional(v.id('listings')),
    tier: v.optional(listingTier),
    createdAt: v.number(),
    paidAt: v.optional(v.number()),
  })
    .index('by_order', ['orderId'])
    .index('by_user', ['userId']),
});
