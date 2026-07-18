# Halolmia 5k Online System Design

Goal: keep the app responsive with roughly 5,000 concurrent online users while
protecting Convex from unbounded reads, write-driven subscription fan-out, and
hot-document counters.

## Current Architecture

- Mobile: Expo Router app with Convex realtime queries.
- Admin: Next.js dashboard with Convex realtime queries.
- Bot: Telegram bot using Convex HTTP client.
- Backend: Convex functions and storage.
- Payments: FastAPI PayTech bridge forwarding verified settlement callbacks to
  Convex.

Convex should stay the source of truth. The scale work is mostly about making
the hot paths narrower and less reactive where live freshness is not needed.

## Hot Paths

1. Home marketplace feed: `listings.listActivePage`, `reels.list`,
   `categories.list`, `dealers.list`, `ads.byPlacement`.
2. Video bozor: `reels.list`, `reels.bySeller`, reel metric mutations.
3. Chat: `messages.myThreads`, `messages.list`, `messages.send`,
   typing/read mutations.
4. Listing detail: `listings.get`, `listings.related`, view counter writes.
5. Admin dashboard: `stats.overview` and full-table admin lists.

## Phase 1: Already Applied

- Bound public reel feed candidates instead of collecting every active reel.
- Added reel compound indexes for active/status and seller/status/active.
- Bound seller reel reads.
- Bound reel comments to the latest 200.
- Bound chat message reads to the latest 120.
- Added fixed-window application rate limits for chat, typing, listings, reels,
  uploads, Telegram auth, AI, and Stripe invoice creation.
- Made video publishing CDN-first with Cloudflare Stream direct uploads for
  mobile reels, admin reels, and dealer showcase videos. Convex storage remains
  a fallback for legacy videos and small poster assets.

These changes reduce transaction size and subscription invalidation work without
changing the product model.

## Rate Limits

Implemented in `packages/backend/convex/rateLimit.ts`.

| Limit | Window |
| --- | --- |
| Chat send per user | 20/min |
| Chat send per thread | 60/min |
| Typing per user/thread | 1/sec |
| Listing create per seller | 10/day |
| Listing views per listing | 500/min |
| Reel views per reel | 500/min |
| Reel watch events per reel | 500/min |
| Reel taps per reel/action | 120/min |
| Reel like/save per user/action | 80/min |
| Reel comments per user | 20/min |
| Reel comments per reel | 120/min |
| Upload URL generation, global | 500/hour |
| Telegram auth starts | 5/10min |
| Telegram verify per Telegram user | 10/10min |
| AI advisor per user | 5/min and 50/day |
| Voice transcription per user | 10/hour |
| Wallet invoice per user | 10/hour |
| Promotion invoice per user | 10/hour |
| Promotion invoice per listing | 3/hour |

The metric limits are currently object-level backstops because the metric APIs
do not yet accept a stable anonymous device key. For fairer limits, pass a
client-generated device key to view/watch mutations and key on
`deviceKey:listingId` or `deviceKey:reelId`.

## Phase 2: Add Before Heavy Launch

### Split Hot Metrics From Source Documents

Move high-churn fields off widely-read documents:

- `listingStats`: `listingId`, `views`.
- `reelStats`: `reelId`, `views`, `watchMs`, `threeSecondViews`, `halfViews`,
  `completions`, `replays`, `quickSkips`, `chatTaps`, `callTaps`.
- Optional `reelEngagement`: `reelId`, `likes`, `saves`, `comments`.

Why: currently `recordView`, `recordWatch`, `recordTap`, and
`incrementViews` patch `reels` / `listings`. Any subscribed feed or detail query
that read those documents can re-run when metrics change.

Rollout:

1. Add optional stats tables and dual-write new mutations.
2. Backfill from existing `reels` / `listings`.
3. Switch detail screens to read stats only where metrics are shown.
4. Keep feed ranking on a coarse cached score updated by cron or moderation
   events, not every watch event.

### Precompute Admin Stats

Replace live `stats.overview` full-table scans with a summary table:

- `platformStats`: totals, status counts, category counts, revenue totals,
  report counts, daily buckets.

Update summary rows from write paths or a scheduled recompute. Admin dashboards
do not need every insert to recalculate every aggregate live.

### Use Digest Shapes For Feeds

If listing/reel tables grow or docs get larger, add feed digest tables:

- `listingFeedCards`: title, price, city, category, firstPhotoId, photoCount,
  seller badge fields, rank fields.
- `reelFeedCards`: video URL/provider, thumb, seller display fields, counts,
  rank score.

The mobile feed should read only card-sized docs, not full source docs plus
joins.

### Search Upgrade

Current search filters the current page in TypeScript. For serious volume:

- Add `searchIndex` for title/description/spec text if Convex search covers the
  target UX.
- Add specific compound indexes for common filters: status/category/city and
  status/category/region.
- Treat price and weight as numeric fields at write time instead of parsing text
  during every query.

### Chat Pagination

The latest 120 messages cap protects the current UI. For complete history:

- Convert `messages.list` to a paginated query.
- Render older messages with "load earlier".
- Keep open thread live only for the newest page.

## Phase 3: Production Operations

- Run Convex Insights before and after each change:
  `npx convex insights --details`.
- Track active subscriptions, bytes read, documents read, and OCC conflicts.
- Add rate limits for expensive user actions: reel watch metrics, listing view
  metrics, AI advisor calls, upload creation, Telegram auth session creation.
- Keep Cloudflare Stream/HLS as the primary public video delivery path. Convex
  storage is fine for metadata, images, and legacy fallback videos, not as the
  only delivery layer for viral video traffic.
- Put Push, AI, and payment-webhook side effects behind scheduled functions or
  idempotent internal mutations.

## 5k User Readiness Checklist

- Public reads are indexed and bounded.
- High-churn metrics are not stored on widely-subscribed source documents.
- Admin analytics do not live-scan every table.
- Video files are served by a video CDN path.
- Chat history is paginated.
- Search fields are normalized at write time.
- Production insights show no high document scans on public queries.
- OCC conflicts are low on counters, payments, chat sends, and metric writes.
