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
export const reelStatus = v.union(
  v.literal('processing'),
  v.literal('ready'),
  v.literal('rejected'),
  v.literal('failed')
);
export const leadType = v.union(
  v.literal('big_player'),
  v.literal('farm_ranch'),
  v.literal('potential_user'),
  v.literal('dealer'),
  v.literal('partner')
);
export const leadStatus = v.union(
  v.literal('new'),
  v.literal('contacted'),
  v.literal('qualified'),
  v.literal('won'),
  v.literal('lost')
);

export default defineSchema({
  categories: defineTable({
    slug: v.string(),
    name: v.string(),
    emoji: v.string(),
    order: v.number(),
    active: v.boolean(),
    // Admin-editable breed/type list for this category. When unset, the app
    // falls back to the built-in defaults (see categories.ts DEFAULT_BREEDS).
    breeds: v.optional(v.array(v.string())),
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
    // Location: viloyat + tuman (shown to users) plus coordinates for real
    // distance ("Yaqin atrofda"). Coords come from GPS or the region centroid.
    region: v.optional(v.string()),
    district: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
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
    priceIntel: v.optional(
      v.object({
        status: v.union(
          v.literal('below_market'),
          v.literal('good_price'),
          v.literal('high_price')
        ),
        medianPrice: v.number(),
        sampleSize: v.number(),
        differencePct: v.number(),
        currency: v.string(),
        basis: v.string(),
        updatedAt: v.number(),
      })
    ),
  })
    .index('by_category', ['category'])
    .index('by_status', ['status'])
    .index('by_status_category', ['status', 'category'])
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

  // Official dealer video showcases ("Rasmiy dilerlar"), managed from the admin
  // panel. Each row is one video card shown in a horizontal row on the app home.
  dealers: defineTable({
    title: v.string(), // e.g. "Changan CS55 Plus"
    dealer: v.optional(v.string()), // dealer / brand name
    // The real user this dealer showcase belongs to. When set, the app can open
    // the seller's profile and the card shows their name/avatar. Promoting a
    // `foydalanuvchi` to a dealer = creating a row with their userId.
    userId: v.optional(v.id('users')),
    videoId: v.id('_storage'), // uploaded video file
    thumbId: v.optional(v.id('_storage')), // poster image (optional)
    order: v.number(),
    active: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_active', ['active'])
    .index('by_user', ['userId']),

  reels: defineTable({
    title: v.string(),
    caption: v.optional(v.string()),
    sellerId: v.optional(v.id('users')),
    listingId: v.optional(v.id('listings')),
    category: v.optional(v.string()),
    city: v.optional(v.string()),
    price: v.optional(v.string()),
    // Current MVP can play Convex storage. Future HLS providers can write hlsUrl.
    videoId: v.optional(v.id('_storage')),
    thumbId: v.optional(v.id('_storage')),
    hlsUrl: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    videoProvider: v.optional(
      v.union(
        v.literal('convex'),
        v.literal('cloudflare'),
        v.literal('mux'),
        v.literal('bunny')
      )
    ),
    providerVideoId: v.optional(v.string()),
    duration: v.optional(v.number()),
    status: reelStatus,
    active: v.boolean(),
    pinned: v.optional(v.boolean()),
    order: v.number(),
    views: v.number(),
    watchMs: v.number(),
    chatTaps: v.number(),
    callTaps: v.number(),
    createdAt: v.number(),
  })
    .index('by_active', ['active'])
    .index('by_status', ['status'])
    .index('by_seller', ['sellerId'])
    .index('by_listing', ['listingId']),

  reelLikes: defineTable({
    userId: v.id('users'),
    reelId: v.id('reels'),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_reel', ['reelId'])
    .index('by_user_reel', ['userId', 'reelId']),

  reelSaves: defineTable({
    userId: v.id('users'),
    reelId: v.id('reels'),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_reel', ['reelId'])
    .index('by_user_reel', ['userId', 'reelId']),

  reelComments: defineTable({
    reelId: v.id('reels'),
    userId: v.optional(v.id('users')),
    userName: v.string(),
    text: v.string(),
    createdAt: v.number(),
  }).index('by_reel', ['reelId']),

  users: defineTable({
    name: v.string(),
    phone: v.string(),
    telegramId: v.optional(v.string()),
    // Set only when Telegram shared the user's own contact (Telegram-confirmed phone).
    // Manual phone login alone does NOT set this.
    phoneVerifiedAt: v.optional(v.number()),
    // Set when Telegram account + Telegram-confirmed phone are both linked.
    // This is the "Tasdiqlangan sotuvchi" badge signal.
    verifiedAt: v.optional(v.number()),
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
    // Marked as an official dealer from the admin panel. Only dealers can have
    // showcase videos attached (see dealers table / dilerlar admin page).
    isDealer: v.optional(v.boolean()),
    // Extra public profile fields for official dealers.
    dealerAddress: v.optional(v.string()),
    dealerHours: v.optional(v.string()),
    dealerMapUrl: v.optional(v.string()),
  })
    .index('by_phone', ['phone'])
    .index('by_telegram', ['telegramId']),

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
    audioId: v.optional(v.id('_storage')), // voice message
    audioDuration: v.optional(v.number()), // voice message length, seconds
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

  // 1:1 video calls, signaled peer-to-peer over Convex (offer/answer SDP + ICE).
  // No third-party video vendor — audio/video media flows directly device-to-device.
  calls: defineTable({
    threadId: v.string(),
    callerId: v.id('users'),
    calleeId: v.id('users'),
    callerName: v.string(),
    calleeName: v.string(),
    offer: v.string(),
    answer: v.optional(v.string()),
    status: v.union(
      v.literal('ringing'),
      v.literal('accepted'),
      v.literal('declined'),
      v.literal('ended'),
      v.literal('missed')
    ),
    createdAt: v.number(),
    endedAt: v.optional(v.number()),
  })
    .index('by_callee', ['calleeId'])
    .index('by_caller', ['callerId']),

  // ICE candidates trickled by each side while a call is connecting.
  callCandidates: defineTable({
    callId: v.id('calls'),
    senderId: v.id('users'),
    candidate: v.string(),
    createdAt: v.number(),
  }).index('by_call', ['callId']),

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
    .index('by_listing', ['listingId'])
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

  userNotifications: defineTable({
    userId: v.id('users'),
    icon: v.string(),
    title: v.string(),
    body: v.string(),
    createdAt: v.number(),
    readAt: v.optional(v.number()),
    targetType: v.optional(v.string()),
    targetId: v.optional(v.string()),
  })
    .index('by_user', ['userId'])
    .index('by_user_read', ['userId', 'readAt']),

  // Expo push tokens, one row per device. A user can be signed in on several
  // devices, so we key by the token (unique) and index by user for fan-out.
  pushTokens: defineTable({
    userId: v.id('users'),
    token: v.string(), // ExponentPushToken[...]
    updatedAt: v.number(),
  })
    .index('by_token', ['token'])
    .index('by_user', ['userId']),

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
    sellerId: v.optional(v.id('users')),
    listingTitle: v.string(),
    reason: v.string(),
    reporter: v.string(),
    date: v.string(),
    status: reportStatus,
  })
    .index('by_status', ['status'])
    .index('by_seller', ['sellerId']),

  payments: defineTable({
    user: v.string(),
    type: v.string(),
    method: v.string(),
    amount: v.string(),
    date: v.string(),
    status: paymentStatus,
  }),

  plans: defineTable({
    title: v.string(),
    kind: v.union(v.literal('whiteboard'), v.literal('kanban')),
    data: v.any(),
    updatedAt: v.number(),
    createdAt: v.number(),
  })
    .index('by_kind', ['kind'])
    .index('by_updated', ['updatedAt']),

  leads: defineTable({
    name: v.string(),
    type: leadType,
    status: leadStatus,
    contactName: v.string(),
    phone: v.string(),
    region: v.string(),
    category: v.string(),
    source: v.string(),
    estimatedValue: v.optional(v.number()),
    owner: v.string(),
    notes: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_type', ['type'])
    .index('by_status', ['status'])
    .index('by_updated', ['updatedAt']),

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
