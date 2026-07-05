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
    photos: v.optional(v.array(v.string())),
    createdAt: v.number(),
  })
    .index('by_category', ['category'])
    .index('by_status', ['status']),

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
  }),

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
