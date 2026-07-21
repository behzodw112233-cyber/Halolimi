import { v } from 'convex/values';
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server';
import { internal } from './_generated/api';

declare const process: { env: Record<string, string | undefined> };

const MIN_AMOUNT = 1_000;
const MIN_STRIPE_AMOUNT = 10_000;
const STRIPE_API = 'https://api.stripe.com/v1';
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_STRIPE_CURRENCY = 'usd';
const DEFAULT_UZS_PER_CURRENCY_UNIT = 13_000;
const ZERO_DECIMAL_CURRENCIES = new Set([
  'bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf',
]);
const TIER_PRICE: Record<string, number> = {
  alo: 6_000,
  zor: 29_000,
  vip: 51_000,
  lux: 102_000,
};

const ANIMALS: Record<string, string> = {
  sheep: '🐑',
  cow: '🐄',
  goat: '🐐',
  chicken: '🐓',
  qurbonlik: '🎁',
};

function stripeKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return key;
}

function stripeMoneyConfig() {
  const currency = (process.env.STRIPE_CURRENCY ?? DEFAULT_STRIPE_CURRENCY).toLowerCase();
  const uzsPerUnit = Number(process.env.STRIPE_UZS_PER_CURRENCY_UNIT ?? DEFAULT_UZS_PER_CURRENCY_UNIT);
  if (currency === 'uzs' || !Number.isFinite(uzsPerUnit) || uzsPerUnit <= 0) {
    throw new Error('Stripe valuta yoki UZS kursi noto\'g\'ri sozlangan');
  }
  return { currency, uzsPerUnit, minorUnit: ZERO_DECIMAL_CURRENCIES.has(currency) ? 1 : 100 };
}

function toStripeAmount(uzsAmount: number) {
  const config = stripeMoneyConfig();
  return {
    currency: config.currency,
    amountMinor: Math.max(1, Math.round((uzsAmount / config.uzsPerUnit) * config.minorUnit)),
  };
}

function encodeForm(values: Record<string, string>) {
  return Object.entries(values)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

async function createStripePaymentIntent(args: {
  amountUzs: number;
  userId: string;
  purpose: 'topup' | 'promote' | 'savings';
  goalId?: string;
  listingId?: string;
  tier?: string;
}) {
  const stripeAmount = toStripeAmount(args.amountUzs);
  const body = encodeForm({
    amount: String(stripeAmount.amountMinor),
    currency: stripeAmount.currency,
    'payment_method_types[0]': 'card',
    'metadata[userId]': args.userId,
    'metadata[amountUzs]': String(args.amountUzs),
    'metadata[purpose]': args.purpose,
    ...(args.goalId ? { 'metadata[goalId]': args.goalId } : {}),
    ...(args.listingId ? { 'metadata[listingId]': args.listingId } : {}),
    ...(args.tier ? { 'metadata[tier]': args.tier } : {}),
  });
  const response = await fetch(`${STRIPE_API}/payment_intents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const data = (await response.json()) as {
    id?: string;
    client_secret?: string;
    error?: { message?: string };
  };
  if (!response.ok || !data.id || !data.client_secret) {
    throw new Error(data.error?.message ?? 'Stripe karta to\'lovi yaratilmadi');
  }
  return { paymentIntentId: data.id, clientSecret: data.client_secret, stripeAmount };
}

async function getStripePaymentIntent(paymentIntentId: string) {
  const response = await fetch(`${STRIPE_API}/payment_intents/${encodeURIComponent(paymentIntentId)}`, {
    headers: { Authorization: `Bearer ${stripeKey()}` },
  });
  const data = (await response.json()) as {
    id?: string;
    status?: string;
    amount_received?: number;
    error?: { message?: string };
  };
  if (!response.ok || !data.id) throw new Error(data.error?.message ?? "Stripe to'lovi tekshirilmadi");
  return data;
}

export const list = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) =>
    await ctx.db
      .query('savingsGoals')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')
      .collect(),
});

export const deposits = query({
  args: { goalId: v.id('savingsGoals'), userId: v.id('users') },
  handler: async (ctx, { goalId, userId }) => {
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.userId !== userId) return [];
    return await ctx.db
      .query('savingsDeposits')
      .withIndex('by_goal', (q) => q.eq('goalId', goalId))
      .order('desc')
      .collect();
  },
});

export const getForPayment = internalQuery({
  args: { goalId: v.id('savingsGoals'), userId: v.id('users') },
  handler: async (ctx, { goalId, userId }) => {
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.userId !== userId || goal.status !== 'active') {
      throw new Error("Jamg'arma maqsadi topilmadi");
    }
    return goal;
  },
});

export const createGoal = mutation({
  args: {
    userId: v.id('users'),
    animalType: v.string(),
    title: v.string(),
    targetAmount: v.number(),
  },
  handler: async (ctx, { userId, animalType, title, targetAmount }) => {
    if (!Number.isFinite(targetAmount) || targetAmount < MIN_AMOUNT) {
      throw new Error(`Minimal maqsad ${MIN_AMOUNT.toLocaleString('ru-RU')} so'm`);
    }
    const emoji = ANIMALS[animalType] ?? '🐾';
    return await ctx.db.insert('savingsGoals', {
      userId,
      animalType,
      emoji,
      title: title.trim() || `${animalType} uchun jamg'arma`,
      targetAmount: Math.round(targetAmount),
      savedAmount: 0,
      status: 'active',
      createdAt: Date.now(),
    });
  },
});

export const depositFromWallet = mutation({
  args: {
    goalId: v.id('savingsGoals'),
    userId: v.id('users'),
    amount: v.number(),
  },
  handler: async (ctx, { goalId, userId, amount }) => {
    if (!Number.isFinite(amount) || amount < MIN_AMOUNT) {
      throw new Error(`Minimal to'lov ${MIN_AMOUNT.toLocaleString('ru-RU')} so'm`);
    }
    const goal = await ctx.db.get(goalId);
    const user = await ctx.db.get(userId);
    if (!goal || goal.userId !== userId || goal.status !== 'active') throw new Error('Maqsad faol emas');
    if (!user || (user.balance ?? 0) < amount) throw new Error("Hisobingizda yetarli mablag' yo'q");
    const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);
    const requestedAmount = Math.round(amount);
    const depositAmount = Math.min(requestedAmount, remaining);
    const walletRemainder = requestedAmount - depositAmount;
    const savedAmount = goal.savedAmount + depositAmount;
    await ctx.db.patch(userId, { balance: (user.balance ?? 0) - requestedAmount + walletRemainder });
    await ctx.db.patch(goalId, {
      savedAmount,
      status: savedAmount >= goal.targetAmount ? 'completed' : 'active',
      completedAt: savedAmount >= goal.targetAmount ? Date.now() : undefined,
    });
    await ctx.db.insert('savingsDeposits', {
      goalId,
      userId,
      amount: depositAmount,
      source: 'wallet',
      createdAt: Date.now(),
    });
    return { savedAmount, status: savedAmount >= goal.targetAmount ? 'completed' : 'active' };
  },
});

export const createStripeCheckout = action({
  args: {
    goalId: v.id('savingsGoals'),
    userId: v.id('users'),
    amount: v.number(),
  },
  handler: async (ctx, { goalId, userId, amount }) => {
    if (!Number.isFinite(amount) || amount < MIN_STRIPE_AMOUNT) {
      return {
        ok: false as const,
        error: `Stripe orqali minimal to'lov ${MIN_STRIPE_AMOUNT.toLocaleString('ru-RU')} so'm`,
      };
    }
    const goal = await ctx.runQuery(internal.jamgarma.getForPayment, { goalId, userId });
    const chargeAmount = Math.round(amount);
    const payment = await createStripePaymentIntent({
      amountUzs: chargeAmount,
      userId: String(userId),
      purpose: 'savings',
      goalId: String(goalId),
    });
    await ctx.runMutation(internal.jamgarma.createStripeInvoice, {
      orderId: payment.paymentIntentId,
      userId,
      goalId,
      amount: chargeAmount,
      stripeAmount: payment.stripeAmount.amountMinor,
      stripeCurrency: payment.stripeAmount.currency,
    });
    return { ok: true as const, ...payment };
  },
});

// The client confirms with Stripe's native/web SDK, then this action retrieves
// the intent from Stripe before applying any balance, promotion, or savings change.
export const confirmStripePayment = action({
  args: { paymentIntentId: v.string() },
  handler: async (ctx, { paymentIntentId }) => {
    const intent = await getStripePaymentIntent(paymentIntentId);
    if (intent.status !== 'succeeded' || intent.amount_received === undefined) {
      return { ok: false as const, error: "To'lov hali tasdiqlanmadi." };
    }
    await ctx.runMutation(internal.jamgarma.settleStripe, {
      sessionId: intent.id!,
      paymentIntentId: intent.id!,
      amountTotalMinor: intent.amount_received,
    });
    return { ok: true as const };
  },
});

export const createStripeTopupPayment = action({
  args: { userId: v.id('users'), amount: v.number() },
  handler: async (ctx, { userId, amount }) => {
    if (!Number.isFinite(amount) || amount < MIN_STRIPE_AMOUNT) {
      return { ok: false as const, error: `Karta orqali minimal to'lov ${MIN_STRIPE_AMOUNT.toLocaleString('ru-RU')} so'm` };
    }
    const chargeAmount = Math.round(amount);
    const payment = await createStripePaymentIntent({
      amountUzs: chargeAmount,
      userId: String(userId),
      purpose: 'topup',
    });
    await ctx.runMutation(internal.jamgarma.createStripeInvoice, {
      orderId: payment.paymentIntentId,
      userId,
      amount: chargeAmount,
      purpose: 'topup',
      stripeAmount: payment.stripeAmount.amountMinor,
      stripeCurrency: payment.stripeAmount.currency,
    });
    return { ok: true as const, ...payment };
  },
});

export const createStripePromotionPayment = action({
  args: { userId: v.id('users'), listingId: v.id('listings'), tier: v.union(v.literal('alo'), v.literal('zor'), v.literal('vip'), v.literal('lux')) },
  handler: async (ctx, { userId, listingId, tier }) => {
    const listing = await ctx.runQuery(internal.jamgarma.getListingForPayment, { listingId, userId });
    const amount = TIER_PRICE[tier];
    const payment = await createStripePaymentIntent({
      amountUzs: amount,
      userId: String(userId),
      purpose: 'promote',
      listingId: String(listing._id),
      tier,
    });
    await ctx.runMutation(internal.jamgarma.createStripeInvoice, {
      orderId: payment.paymentIntentId,
      userId,
      amount,
      purpose: 'promote',
      listingId: listing._id,
      tier,
      stripeAmount: payment.stripeAmount.amountMinor,
      stripeCurrency: payment.stripeAmount.currency,
    });
    return { ok: true as const, amount, ...payment };
  },
});

export const getListingForPayment = internalQuery({
  args: { listingId: v.id('listings'), userId: v.id('users') },
  handler: async (ctx, { listingId, userId }) => {
    const listing = await ctx.db.get(listingId);
    if (!listing || listing.ownerId !== userId) throw new Error("E'lon topilmadi yoki sizga tegishli emas");
    return listing;
  },
});

export const createStripeInvoice = internalMutation({
  args: {
    orderId: v.string(),
    userId: v.id('users'),
    goalId: v.optional(v.id('savingsGoals')),
    amount: v.number(),
    stripeAmount: v.number(),
    stripeCurrency: v.string(),
    purpose: v.optional(v.string()),
    listingId: v.optional(v.id('listings')),
    tier: v.optional(v.union(v.literal('alo'), v.literal('zor'), v.literal('vip'), v.literal('lux'))),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('invoices')
      .withIndex('by_order', (q) => q.eq('orderId', args.orderId))
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert('invoices', {
      orderId: args.orderId,
      userId: args.userId,
      goalId: args.goalId,
      amount: args.amount,
      purpose: args.purpose ?? 'savings',
      method: 'stripe',
      checkoutSessionId: args.orderId,
      stripeAmount: args.stripeAmount,
      stripeCurrency: args.stripeCurrency,
      status: 'pending',
      createdAt: Date.now(),
    });
  },
});

export const listInvoices = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query('invoices').collect();
    const sorted = rows.sort((a, b) => b.createdAt - a.createdAt);
    return Promise.all(
      sorted.map(async (invoice) => {
        const [user, listing] = await Promise.all([
          ctx.db.get(invoice.userId),
          invoice.listingId ? ctx.db.get(invoice.listingId) : Promise.resolve(null),
        ]);
        return {
          ...invoice,
          userName: user?.name ?? 'Foydalanuvchi',
          userPhone: user?.phone ?? '',
          listingTitle: listing?.title ?? null,
        };
      })
    );
  },
});

export const settleStripe = internalMutation({
  args: {
    sessionId: v.string(),
    paymentIntentId: v.optional(v.string()),
    amountTotalMinor: v.optional(v.number()),
  },
  handler: async (ctx, { sessionId, paymentIntentId, amountTotalMinor }) => {
    const invoice = await ctx.db
      .query('invoices')
      .withIndex('by_order', (q) => q.eq('orderId', sessionId))
      .first();
    if (!invoice || invoice.status !== 'pending') return;
    if (amountTotalMinor === undefined || amountTotalMinor !== invoice.stripeAmount) {
      throw new Error('Stripe summa mos emas');
    }
    const user = await ctx.db.get(invoice.userId);
    if (!user) throw new Error('Foydalanuvchi topilmadi');
    if (invoice.purpose === 'topup') {
      await ctx.db.patch(invoice._id, { status: 'success', paidAt: Date.now(), gateway: 'stripe', paymentIntentId: paymentIntentId ?? sessionId });
      await ctx.db.patch(user._id, { balance: (user.balance ?? 0) + invoice.amount });
      await ctx.db.insert('payments', { user: user.name, type: "Hisob to'ldirish", method: 'Stripe', amount: `${invoice.amount.toLocaleString('ru-RU')} so'm`, date: new Date().toLocaleDateString('ru-RU'), status: 'success' });
      return;
    }
    if (invoice.purpose === 'promote') {
      const listing = invoice.listingId ? await ctx.db.get(invoice.listingId) : null;
      if (!listing || listing.ownerId !== invoice.userId || !invoice.tier) throw new Error("E'lon topilmadi");
      const settings = await ctx.db.query('settings').first();
      await ctx.db.patch(invoice._id, { status: 'success', paidAt: Date.now(), gateway: 'stripe', paymentIntentId: paymentIntentId ?? sessionId });
      await ctx.db.patch(listing._id, { tier: invoice.tier, boostedUntil: Date.now() + (settings?.feedBoostDays ?? 28) * DAY_MS });
      await ctx.db.insert('payments', { user: user.name, type: `Reklama: ${invoice.tier.toUpperCase()}`, method: 'Stripe', amount: `${invoice.amount.toLocaleString('ru-RU')} so'm`, date: new Date().toLocaleDateString('ru-RU'), status: 'success' });
      return;
    }
    if (invoice.purpose !== 'savings' || !invoice.goalId) return;
    const goal = await ctx.db.get(invoice.goalId);
    if (!goal || goal.userId !== invoice.userId) throw new Error("Jamg'arma maqsadi topilmadi");
    const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);
    const depositAmount = Math.min(invoice.amount, remaining);
    const walletTopup = Math.max(0, invoice.amount - depositAmount);
    const savedAmount = goal.savedAmount + depositAmount;
    await ctx.db.patch(invoice._id, { status: 'success', paidAt: Date.now(), gateway: 'stripe', paymentIntentId: paymentIntentId ?? sessionId });
    if (walletTopup > 0) {
      await ctx.db.patch(user._id, { balance: (user.balance ?? 0) + walletTopup });
    }
    await ctx.db.patch(goal._id, {
      savedAmount,
      status: savedAmount >= goal.targetAmount ? 'completed' : 'active',
      completedAt: savedAmount >= goal.targetAmount ? Date.now() : undefined,
    });
    if (depositAmount > 0) {
      await ctx.db.insert('savingsDeposits', {
        goalId: goal._id,
        userId: invoice.userId,
        amount: depositAmount,
        source: 'stripe',
        reference: sessionId,
        createdAt: Date.now(),
      });
    }
    await ctx.db.insert('payments', {
      user: user.name,
      type: `Jamg'arma: ${goal.title}`,
      method: 'Stripe',
      amount: `${invoice.amount.toLocaleString('ru-RU')} so'm`,
      date: new Date().toLocaleDateString('ru-RU'),
      status: 'success',
    });
  },
});
