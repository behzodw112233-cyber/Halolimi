import { v } from 'convex/values';
import { internalMutation } from './_generated/server';

const MAX_ATTEMPTS = 5;
const purposeValidator = v.union(v.literal('login'), v.literal('listing'));

export const createRequest = internalMutation({
  args: {
    phone: v.string(),
    purpose: purposeValidator,
    codeHash: v.string(),
    provider: v.string(),
    providerMessageId: v.optional(v.string()),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const pending = await ctx.db
      .query('smsOtps')
      .withIndex('by_phone_purpose_status_created', (q) =>
        q.eq('phone', args.phone).eq('purpose', args.purpose).eq('status', 'pending')
      )
      .collect();
    await Promise.all(pending.map((row) => ctx.db.patch(row._id, { status: 'expired' })));
    await ctx.db.insert('smsOtps', {
      ...args,
      status: 'pending',
      attempts: 0,
      createdAt: now,
    });
  },
});

export const verifyRequest = internalMutation({
  args: {
    phone: v.string(),
    purpose: purposeValidator,
    codeHash: v.string(),
  },
  handler: async (ctx, { phone, purpose, codeHash }) => {
    const request = await ctx.db
      .query('smsOtps')
      .withIndex('by_phone_purpose_status_created', (q) =>
        q.eq('phone', phone).eq('purpose', purpose).eq('status', 'pending')
      )
      .order('desc')
      .first();
    if (!request) return false;
    const now = Date.now();
    if (request.expiresAt < now) {
      await ctx.db.patch(request._id, { status: 'expired' });
      return false;
    }
    if (request.codeHash !== codeHash) {
      const attempts = request.attempts + 1;
      await ctx.db.patch(request._id, {
        attempts,
        status: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
      });
      return false;
    }
    await ctx.db.patch(request._id, { status: 'verified', verifiedAt: now });
    return true;
  },
});
