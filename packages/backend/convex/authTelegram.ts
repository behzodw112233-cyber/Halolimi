import { v } from 'convex/values';
import { mutation, query, type MutationCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { createForUser } from './notifications';

// A login handshake is only valid for a few minutes.
const SESSION_TTL_MS = 5 * 60 * 1000;

/** Normalize any Telegram/user phone to the canonical +998XXXXXXXXX form. */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return '+998' + digits.slice(-9);
}

/** Find-or-create a user by phone (same identity rule as the app login). */
async function getOrCreateUser(ctx: MutationCtx, phone: string, name?: string) {
  const existing = await ctx.db
    .query('users')
    .withIndex('by_phone', (q) => q.eq('phone', phone))
    .first();
  if (existing) return existing._id;
  return ctx.db.insert('users', {
    name: name?.trim() || 'Foydalanuvchi',
    phone,
    listings: 0,
    joined: new Date().toLocaleDateString('ru-RU'),
    status: 'active',
  });
}

/**
 * Attach Telegram identity + mark the seller verified.
 * Phone must come from Telegram's contact share (bot enforces own-contact).
 * Reassigns telegramId if it was linked to another user.
 */
async function markTelegramVerified(
  ctx: MutationCtx,
  args: { phone: string; name?: string; telegramId: string }
): Promise<Id<'users'>> {
  const phone = normalizePhone(args.phone);
  const userId = await getOrCreateUser(ctx, phone, args.name);
  const now = Date.now();

  // One Telegram account → one Convex user. Detach from any previous row.
  const previous = await ctx.db
    .query('users')
    .withIndex('by_telegram', (q) => q.eq('telegramId', args.telegramId))
    .first();
  if (previous && previous._id !== userId) {
    await ctx.db.patch(previous._id, {
      telegramId: undefined,
      phoneVerifiedAt: undefined,
      verifiedAt: undefined,
    });
  }

  const user = await ctx.db.get(userId);
  // Legacy users already had telegramId from an earlier contact share.
  const alreadyVerified = !!(user?.verifiedAt || user?.telegramId);

  await ctx.db.patch(userId, {
    telegramId: args.telegramId,
    phoneVerifiedAt: user?.phoneVerifiedAt ?? now,
    verifiedAt: user?.verifiedAt ?? now,
  });

  // First-time verification → inbox notice so the seller sees the badge payoff.
  if (!alreadyVerified) {
    await createForUser(ctx, {
      userId,
      icon: 'shield-checkmark',
      title: 'Sotuvchi tasdiqlandi',
      body: 'Telegram va telefon raqamingiz mos keldi. Endi eʼlonlaringizda «Tasdiqlangan sotuvchi» belgisi koʻrinadi.',
      targetType: 'profile',
    });
  }

  return userId;
}

/** App: open a pending login handshake for a freshly generated token. */
export const start = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const existing = await ctx.db
      .query('authSessions')
      .withIndex('by_token', (q) => q.eq('token', token))
      .first();
    if (existing) return; // idempotent
    await ctx.db.insert('authSessions', {
      token,
      status: 'pending',
      createdAt: Date.now(),
    });
  },
});

/** App: poll (reactively) whether the handshake has been verified. */
export const status = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const s = await ctx.db
      .query('authSessions')
      .withIndex('by_token', (q) => q.eq('token', token))
      .first();
    if (!s) return { status: 'pending' as const, userId: null };
    if (s.status === 'verified' && s.userId) {
      return { status: 'verified' as const, userId: s.userId };
    }
    if (Date.now() - s.createdAt > SESSION_TTL_MS) {
      return { status: 'expired' as const, userId: null };
    }
    return { status: 'pending' as const, userId: null };
  },
});

/**
 * Bot: the user shared their (Telegram-verified) contact — mark the handshake
 * verified and attach the resolved user. Creates the row if the app's `start`
 * hasn't landed yet, so ordering never matters.
 */
export const verify = mutation({
  args: {
    token: v.string(),
    phone: v.string(),
    name: v.optional(v.string()),
    telegramId: v.optional(v.string()),
  },
  handler: async (ctx, { token, phone, name, telegramId }) => {
    if (!telegramId) {
      throw new Error('Telegram ID majburiy');
    }
    const userId = await markTelegramVerified(ctx, { phone, name, telegramId });
    const existing = await ctx.db
      .query('authSessions')
      .withIndex('by_token', (q) => q.eq('token', token))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { status: 'verified', userId });
    } else {
      await ctx.db.insert('authSessions', {
        token,
        status: 'verified',
        userId,
        createdAt: Date.now(),
      });
    }
    return true;
  },
});

/** Bot: link the Telegram account to the same phone-based Convex user identity. */
export const linkBot = mutation({
  args: { telegramId: v.string(), phone: v.string(), name: v.optional(v.string()) },
  handler: async (ctx, { telegramId, phone, name }) => {
    return await markTelegramVerified(ctx, { phone, name, telegramId });
  },
});

/** Bot: resolve a Telegram user into the linked Convex profile + live counters. */
export const botProfile = query({
  args: { telegramId: v.string() },
  handler: async (ctx, { telegramId }) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_telegram', (q) => q.eq('telegramId', telegramId))
      .first();
    if (!user) return null;

    const saved = await ctx.db
      .query('saved')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();
    const listings = await ctx.db
      .query('listings')
      .withIndex('by_owner', (q) => q.eq('ownerId', user._id))
      .collect();

    return {
      userId: user._id,
      name: user.name,
      phone: user.phone,
      balance: user.balance ?? 0,
      verified: !!(user.verifiedAt || user.telegramId),
      savedCount: saved.length,
      listingCount: listings.length,
      activeListingCount: listings.filter((l) => l.status === 'active').length,
      pendingListingCount: listings.filter((l) => l.status === 'pending').length,
    };
  },
});
