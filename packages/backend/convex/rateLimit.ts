import { ConvexError, v } from 'convex/values';
import { internalMutation } from './_generated/server';
import type { MutationCtx } from './_generated/server';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const RATE_LIMITS = {
  sendMessageUser: { limit: 20, periodMs: MINUTE },
  sendMessageThread: { limit: 60, periodMs: MINUTE },
  typingThread: { limit: 1, periodMs: SECOND },
  listingView: { limit: 500, periodMs: MINUTE },
  reelView: { limit: 500, periodMs: MINUTE },
  reelWatch: { limit: 500, periodMs: MINUTE },
  reelTap: { limit: 120, periodMs: MINUTE },
  reelReactionUser: { limit: 80, periodMs: MINUTE },
  reelCommentUser: { limit: 20, periodMs: MINUTE },
  reelCommentTarget: { limit: 120, periodMs: MINUTE },
  uploadUrlGlobal: { limit: 500, periodMs: HOUR },
  cloudflareUploadGlobal: { limit: 300, periodMs: HOUR },
  cloudflareUploadUser: { limit: 30, periodMs: HOUR },
  authStartToken: { limit: 5, periodMs: 10 * MINUTE },
  authVerifyTelegram: { limit: 10, periodMs: 10 * MINUTE },
  otpPhone: { limit: 3, periodMs: 10 * MINUTE },
  otpVerify: { limit: 10, periodMs: 10 * MINUTE },
  createListingUser: { limit: 10, periodMs: DAY },
  aiAdvisorUser: { limit: 5, periodMs: MINUTE },
  aiAdvisorDaily: { limit: 50, periodMs: DAY },
  aiTranscribeUser: { limit: 10, periodMs: HOUR },
  createInvoiceUser: { limit: 10, periodMs: HOUR },
  promoteInvoiceUser: { limit: 50, periodMs: HOUR },
  promoteInvoiceListing: { limit: 30, periodMs: HOUR },
} as const;

type RateLimitName = keyof typeof RATE_LIMITS;

function retryAfterMs(windowStart: number, periodMs: number) {
  return Math.max(0, windowStart + periodMs - Date.now());
}

export async function enforceRateLimit(
  ctx: MutationCtx,
  name: RateLimitName,
  key: string
) {
  const config = RATE_LIMITS[name];
  const now = Date.now();
  const normalizedKey = key || 'global';
  const existing = await ctx.db
    .query('rateLimits')
    .withIndex('by_name_key', (q) => q.eq('name', name).eq('key', normalizedKey))
    .first();

  if (!existing || now - existing.windowStart >= config.periodMs) {
    if (existing) {
      await ctx.db.patch(existing._id, { count: 1, windowStart: now, updatedAt: now });
    } else {
      await ctx.db.insert('rateLimits', {
        name,
        key: normalizedKey,
        count: 1,
        windowStart: now,
        updatedAt: now,
      });
    }
    return;
  }

  if (existing.count >= config.limit) {
    throw new ConvexError({
      code: 'RATE_LIMITED',
      name,
      retryAfterMs: retryAfterMs(existing.windowStart, config.periodMs),
    });
  }

  await ctx.db.patch(existing._id, { count: existing.count + 1, updatedAt: now });
}

const rateLimitName = v.union(
  ...Object.keys(RATE_LIMITS).map((name) => v.literal(name)) as [
    ReturnType<typeof v.literal>,
    ReturnType<typeof v.literal>,
    ...ReturnType<typeof v.literal>[],
  ]
);

export const consumeActionLimit = internalMutation({
  args: { name: rateLimitName, key: v.string() },
  handler: (ctx, { name, key }) => enforceRateLimit(ctx, name as RateLimitName, key),
});
