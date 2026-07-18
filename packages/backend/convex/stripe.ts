import { v } from 'convex/values';
import { action, internalMutation, mutation, query } from './_generated/server';
import { internal } from './_generated/api';
import { invoiceStatus, listingTier } from './schema';

declare const process: { env: Record<string, string | undefined> };

const MIN_AMOUNT = 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Authoritative promotion prices (UZS). The client never sends the amount for a
// promotion; the tier maps to a price here so it cannot be tampered with.
const TIER_PRICE: Record<string, number> = {
  alo: 6000,
  zor: 29000,
  vip: 51000,
  lux: 102000,
};

const METHOD_LABEL: Record<string, string> = {
  stripe: 'Stripe',
  card: 'Stripe',
  click: 'Stripe',
  payme: 'Stripe',
  atmos: 'Stripe',
  uzcard: 'Stripe',
  inpay: 'Stripe',
};

const methodLabel = (m?: string) =>
  (m ? METHOD_LABEL[m.toLowerCase()] ?? m : undefined) ?? 'Stripe';

function stripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return key;
}

function siteUrl() {
  return (process.env.CONVEX_SITE_URL ?? 'https://halolmi.uz').replace(/\/$/, '');
}

function stripeCurrency() {
  return (process.env.STRIPE_CURRENCY ?? 'usd').toLowerCase();
}

function stripeUnitAmount(amountUzs: number) {
  const currency = stripeCurrency();
  if (currency === 'uzs') return Math.round(amountUzs);

  // Stripe test accounts commonly use USD. Keep the marketplace ledger in UZS,
  // but charge a test-card equivalent in cents. Override with Convex env if
  // your Stripe account supports another presentment currency.
  const uzsPerUsd = Number(process.env.STRIPE_UZS_PER_USD ?? 12500);
  const cents = Math.round((amountUzs / uzsPerUsd) * 100);
  return Math.max(50, cents);
}

function formBody(values: Record<string, string | number | boolean | undefined>) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) body.set(key, String(value));
  }
  return body;
}

async function stripeRequest<T>(path: string, body?: URLSearchParams): Promise<T> {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${stripeSecretKey()}`,
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body,
  });
  const data = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message ?? `Stripe request failed (${res.status})`);
  return data;
}

type StripeCheckoutSession = {
  id: string;
  url?: string | null;
  client_secret?: string | null;
  payment_status?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  payment_intent?: string | { id?: string } | null;
  metadata?: Record<string, string> | null;
};

type StripePaymentIntent = {
  id: string;
  client_secret?: string | null;
  status?: string | null;
  amount?: number | null;
  currency?: string | null;
  metadata?: Record<string, string> | null;
};

type StripeEvent = {
  id: string;
  type: string;
  data?: { object?: StripeCheckoutSession | StripePaymentIntent };
};

async function createStripeCheckout(args: {
  amount: number;
  description: string;
  purpose: 'topup' | 'promote';
  userId: string;
  listingId?: string;
  tier?: string;
  embedded?: boolean;
}): Promise<{
  orderId: string;
  payUrl?: string;
  clientSecret?: string;
  method: string;
  stripeAmount: number;
  stripeCurrency: string;
}> {
  const currency = stripeCurrency();
  const unitAmount = stripeUnitAmount(args.amount);
  const metadata: Record<string, string> = {
    gateway: 'stripe',
    purpose: args.purpose,
    userId: args.userId,
    amountUzs: String(args.amount),
    stripeAmount: String(unitAmount),
    stripeCurrency: currency,
  };
  if (args.listingId) metadata.listingId = args.listingId;
  if (args.tier) metadata.tier = args.tier;

  const body = formBody({
    mode: 'payment',
    ui_mode: args.embedded ? 'embedded_page' : undefined,
    return_url: args.embedded
      ? process.env.STRIPE_RETURN_URL ?? `${siteUrl()}/stripe/success?session_id={CHECKOUT_SESSION_ID}`
      : undefined,
    success_url: args.embedded
      ? undefined
      : process.env.STRIPE_SUCCESS_URL ?? `${siteUrl()}/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: args.embedded ? undefined : process.env.STRIPE_CANCEL_URL ?? `${siteUrl()}/stripe/cancel`,
    client_reference_id: args.userId,
    'line_items[0][quantity]': 1,
    'line_items[0][price_data][currency]': currency,
    'line_items[0][price_data][unit_amount]': unitAmount,
    'line_items[0][price_data][product_data][name]': args.description,
    'metadata[gateway]': metadata.gateway,
    'metadata[purpose]': metadata.purpose,
    'metadata[userId]': metadata.userId,
    'metadata[amountUzs]': metadata.amountUzs,
    'metadata[stripeAmount]': metadata.stripeAmount,
    'metadata[stripeCurrency]': metadata.stripeCurrency,
    'metadata[listingId]': metadata.listingId,
    'metadata[tier]': metadata.tier,
    'payment_intent_data[metadata][gateway]': metadata.gateway,
    'payment_intent_data[metadata][purpose]': metadata.purpose,
    'payment_intent_data[metadata][userId]': metadata.userId,
    'payment_intent_data[metadata][amountUzs]': metadata.amountUzs,
    'payment_intent_data[metadata][stripeAmount]': metadata.stripeAmount,
    'payment_intent_data[metadata][stripeCurrency]': metadata.stripeCurrency,
    'payment_intent_data[metadata][listingId]': metadata.listingId,
    'payment_intent_data[metadata][tier]': metadata.tier,
  });

  const session = await stripeRequest<StripeCheckoutSession>('/checkout/sessions', body);
  if (args.embedded && !session.client_secret) {
    throw new Error('Stripe did not return an embedded checkout client secret');
  }
  if (!args.embedded && !session.url) throw new Error('Stripe did not return a checkout URL');
  return {
    orderId: session.id,
    payUrl: session.url ?? undefined,
    clientSecret: session.client_secret ?? undefined,
    method: 'Stripe',
    stripeAmount: unitAmount,
    stripeCurrency: currency,
  };
}

async function createStripePaymentIntent(args: {
  amount: number;
  description: string;
  purpose: 'topup' | 'promote';
  userId: string;
  listingId?: string;
  tier?: string;
}): Promise<{
  orderId: string;
  payUrl?: undefined;
  clientSecret: string;
  method: string;
  stripeAmount: number;
  stripeCurrency: string;
}> {
  const currency = stripeCurrency();
  const unitAmount = stripeUnitAmount(args.amount);
  const body = formBody({
    amount: unitAmount,
    currency,
    description: args.description,
    'payment_method_types[0]': 'card',
    'metadata[gateway]': 'stripe',
    'metadata[purpose]': args.purpose,
    'metadata[userId]': args.userId,
    'metadata[amountUzs]': args.amount,
    'metadata[stripeAmount]': unitAmount,
    'metadata[stripeCurrency]': currency,
    'metadata[listingId]': args.listingId,
    'metadata[tier]': args.tier,
  });

  const intent = await stripeRequest<StripePaymentIntent>('/payment_intents', body);
  if (!intent.client_secret) throw new Error('Stripe did not return a payment client secret');
  return {
    orderId: intent.id,
    clientSecret: intent.client_secret,
    method: 'Stripe',
    stripeAmount: unitAmount,
    stripeCurrency: currency,
  };
}

function paymentIntentId(session: StripeCheckoutSession) {
  if (typeof session.payment_intent === 'string') return session.payment_intent;
  return session.payment_intent?.id;
}

function assertStripeSessionMatchesInvoice(session: StripeCheckoutSession, inv: {
  orderId: string;
  amount: number;
  stripeAmount?: number;
  stripeCurrency?: string;
}) {
  if (session.id !== inv.orderId) throw new Error('Stripe session id mismatch');
  if (session.payment_status !== 'paid') throw new Error('Stripe session is not paid');
  if ((session.metadata?.gateway ?? '') !== 'stripe') throw new Error('Stripe metadata gateway mismatch');
  if (Number(session.metadata?.amountUzs ?? NaN) !== inv.amount) {
    throw new Error('Stripe metadata amount mismatch');
  }

  const expectedAmount = inv.stripeAmount;
  if (expectedAmount !== undefined && session.amount_total !== expectedAmount) {
    throw new Error('Stripe amount_total mismatch');
  }

  const expectedCurrency = inv.stripeCurrency;
  if (expectedCurrency && session.currency?.toLowerCase() !== expectedCurrency.toLowerCase()) {
    throw new Error('Stripe currency mismatch');
  }
}

function assertStripePaymentIntentMatchesInvoice(intent: StripePaymentIntent, inv: {
  orderId: string;
  amount: number;
  stripeAmount?: number;
  stripeCurrency?: string;
}) {
  if (intent.id !== inv.orderId) throw new Error('Stripe payment intent id mismatch');
  if (intent.status !== 'succeeded') throw new Error('Stripe payment intent is not paid');
  if ((intent.metadata?.gateway ?? '') !== 'stripe') throw new Error('Stripe metadata gateway mismatch');
  if (Number(intent.metadata?.amountUzs ?? NaN) !== inv.amount) {
    throw new Error('Stripe metadata amount mismatch');
  }

  const expectedAmount = inv.stripeAmount;
  if (expectedAmount !== undefined && intent.amount !== expectedAmount) {
    throw new Error('Stripe amount mismatch');
  }

  const expectedCurrency = inv.stripeCurrency;
  if (expectedCurrency && intent.currency?.toLowerCase() !== expectedCurrency.toLowerCase()) {
    throw new Error('Stripe currency mismatch');
  }
}

/**
 * App entry point: create a wallet top-up invoice and return Stripe Checkout.
 * Settlement happens later via the verified Stripe webhook.
 */
export const createInvoice = action({
  args: {
    userId: v.id('users'),
    amount: v.number(),
    method: v.optional(v.string()),
    embedded: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    { userId, amount, embedded }
  ): Promise<{ orderId: string; payUrl?: string; clientSecret?: string }> => {
    await ctx.runMutation((internal as any).rateLimit.consumeActionLimit, {
      name: 'createInvoiceUser',
      key: userId,
    });

    if (!Number.isFinite(amount) || amount < MIN_AMOUNT) {
      throw new Error(`Minimal summa ${MIN_AMOUNT} som`);
    }
    const rounded = Math.round(amount);
    const checkout = embedded
      ? await createStripePaymentIntent({
          amount: rounded,
          description: 'Halolmi hisobini toldirish',
          purpose: 'topup',
          userId,
        })
      : await createStripeCheckout({
          amount: rounded,
          description: 'Halolmi hisobini toldirish',
          purpose: 'topup',
          userId,
        });

    await ctx.runMutation(internal.stripe.createPending, {
      orderId: checkout.orderId,
      userId,
      amount: rounded,
      method: checkout.method,
      payUrl: checkout.payUrl,
      gateway: 'stripe',
      checkoutSessionId: embedded ? undefined : checkout.orderId,
      paymentIntentId: embedded ? checkout.orderId : undefined,
      stripeAmount: checkout.stripeAmount,
      stripeCurrency: checkout.stripeCurrency,
    });
    return { orderId: checkout.orderId, payUrl: checkout.payUrl, clientSecret: checkout.clientSecret };
  },
});

export const createPending = internalMutation({
  args: {
    orderId: v.string(),
    userId: v.id('users'),
    amount: v.number(),
    method: v.string(),
    payUrl: v.optional(v.string()),
    gateway: v.optional(v.string()),
    checkoutSessionId: v.optional(v.string()),
    paymentIntentId: v.optional(v.string()),
    stripeAmount: v.optional(v.number()),
    stripeCurrency: v.optional(v.string()),
    purpose: v.optional(v.string()),
    listingId: v.optional(v.id('listings')),
    tier: v.optional(listingTier),
  },
  handler: (ctx, args) =>
    ctx.db.insert('invoices', {
      ...args,
      purpose: args.purpose ?? 'topup',
      status: 'pending',
      createdAt: Date.now(),
    }),
});

export const promoteWithBalance = mutation({
  args: {
    userId: v.id('users'),
    listingId: v.id('listings'),
    tier: listingTier,
  },
  handler: async (ctx, { userId, listingId, tier }) => {
    const amount = TIER_PRICE[tier];
    if (!amount) throw new Error('Nomalum tarif');

    const [user, listing] = await Promise.all([ctx.db.get(userId), ctx.db.get(listingId)]);
    if (!user) throw new Error('Foydalanuvchi topilmadi');
    if (!listing) throw new Error('Elon topilmadi');
    if (listing.ownerId !== userId) throw new Error('Bu elonni reklama qilish mumkin emas');

    const balance = user.balance ?? 0;
    if (balance < amount) {
      throw new Error(`Hisobda mablag yetarli emas. Kerak: ${amount.toLocaleString('ru-RU')} som`);
    }

    const settings = await ctx.db.query('settings').first();
    const days = settings?.feedBoostDays ?? 28;
    const now = Date.now();
    const orderId = `wallet_${listingId}_${tier}_${now}`;

    await ctx.db.patch(userId, { balance: balance - amount });
    await ctx.db.patch(listingId, {
      tier,
      boostedUntil: now + days * DAY_MS,
    });
    await ctx.db.insert('invoices', {
      orderId,
      userId,
      amount,
      method: 'Wallet',
      gateway: 'wallet',
      purpose: 'promote',
      listingId,
      tier,
      status: 'success',
      createdAt: now,
      paidAt: now,
    });
    await ctx.db.insert('payments', {
      user: user.name,
      type: `Reklama: ${tier.toUpperCase()}`,
      method: 'Wallet',
      amount: `${amount.toLocaleString('ru-RU')} som`,
      date: new Date(now).toLocaleDateString('ru-RU'),
      status: 'success',
    });

    return { ok: true, balance: balance - amount, boostedUntil: now + days * DAY_MS };
  },
});

/**
 * App: pay to promote a listing. Price is derived from the tier server-side.
 */
export const createPromoteInvoice = action({
  args: {
    userId: v.id('users'),
    listingId: v.id('listings'),
    tier: listingTier,
    method: v.optional(v.string()),
    embedded: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    { userId, listingId, tier, embedded }
  ): Promise<{ orderId: string; payUrl?: string; clientSecret?: string }> => {
    await ctx.runMutation((internal as any).rateLimit.consumeActionLimit, {
      name: 'promoteInvoiceUser',
      key: userId,
    });
    await ctx.runMutation((internal as any).rateLimit.consumeActionLimit, {
      name: 'promoteInvoiceListing',
      key: listingId,
    });

    const amount = TIER_PRICE[tier];
    if (!amount) throw new Error('Nomalum tarif');
    const checkout = embedded
      ? await createStripePaymentIntent({
          amount,
          description: `Reklama: ${tier.toUpperCase()}`,
          purpose: 'promote',
          userId,
          listingId,
          tier,
        })
      : await createStripeCheckout({
          amount,
          description: `Reklama: ${tier.toUpperCase()}`,
          purpose: 'promote',
          userId,
          listingId,
          tier,
        });

    await ctx.runMutation(internal.stripe.createPending, {
      orderId: checkout.orderId,
      userId,
      amount,
      method: checkout.method,
      payUrl: checkout.payUrl,
      gateway: 'stripe',
      checkoutSessionId: embedded ? undefined : checkout.orderId,
      paymentIntentId: embedded ? checkout.orderId : undefined,
      stripeAmount: checkout.stripeAmount,
      stripeCurrency: checkout.stripeCurrency,
      purpose: 'promote',
      listingId,
      tier,
    });
    return { orderId: checkout.orderId, payUrl: checkout.payUrl, clientSecret: checkout.clientSecret };
  },
});

export const refreshInvoice = action({
  args: { orderId: v.string() },
  handler: async (ctx, { orderId }) => {
    if (orderId.startsWith('pi_')) {
      const intent = await stripeRequest<StripePaymentIntent>(`/payment_intents/${orderId}`);
      if (intent.status === 'succeeded') {
        await ctx.runMutation(internal.stripe.reconcilePaidPaymentIntent, {
          intent,
          stripeEventId: undefined,
        });
      }
      return true;
    }

    const session = await stripeRequest<StripeCheckoutSession>(
      `/checkout/sessions/${orderId}?expand[]=payment_intent`
    );
    if (session.payment_status === 'paid') {
      await ctx.runMutation(internal.stripe.reconcilePaidSession, {
        session,
        stripeEventId: undefined,
      });
    } else if (session.payment_status === 'unpaid') {
      return true;
    }
    return true;
  },
});

export const reconcilePaidPaymentIntent = internalMutation({
  args: {
    intent: v.any(),
    stripeEventId: v.optional(v.string()),
  },
  handler: async (ctx, { intent, stripeEventId }) => {
    const stripeIntent = intent as StripePaymentIntent;
    const orderId = stripeIntent.id;
    const inv = await ctx.db
      .query('invoices')
      .withIndex('by_order', (q) => q.eq('orderId', orderId))
      .first();
    if (!inv || inv.status !== 'pending') return;
    assertStripePaymentIntentMatchesInvoice(stripeIntent, inv);
    await ctx.db.patch(inv._id, {
      status: 'success',
      paidAt: Date.now(),
      method: 'Stripe',
      gateway: 'stripe',
      paymentIntentId: stripeIntent.id,
      stripeAmount: stripeIntent.amount ?? inv.stripeAmount,
      stripeCurrency: stripeIntent.currency ?? inv.stripeCurrency,
      stripeEventId,
    });

    const user = await ctx.db.get(inv.userId);
    if (!user) return;

    let ledgerType = 'Hisob toldirish';
    if (inv.purpose === 'promote' && inv.listingId && inv.tier) {
      const settings = await ctx.db.query('settings').first();
      const days = settings?.feedBoostDays ?? 28;
      await ctx.db.patch(inv.listingId, {
        tier: inv.tier,
        boostedUntil: Date.now() + days * DAY_MS,
      });
      ledgerType = `Reklama: ${inv.tier.toUpperCase()}`;
    } else {
      await ctx.db.patch(inv.userId, { balance: (user.balance ?? 0) + inv.amount });
    }

    await ctx.db.insert('payments', {
      user: user.name,
      type: ledgerType,
      method: methodLabel(inv.method),
      amount: `${inv.amount.toLocaleString('ru-RU')} som`,
      date: new Date().toLocaleDateString('ru-RU'),
      status: 'success',
    });
  },
});

export const reconcilePaidSession = internalMutation({
  args: {
    session: v.any(),
    stripeEventId: v.optional(v.string()),
  },
  handler: async (ctx, { session, stripeEventId }) => {
    const stripeSession = session as StripeCheckoutSession;
    const orderId = stripeSession.id;
    const inv = await ctx.db
      .query('invoices')
      .withIndex('by_order', (q) => q.eq('orderId', orderId))
      .first();
    if (!inv || inv.status !== 'pending') return;
    assertStripeSessionMatchesInvoice(stripeSession, inv);
    await ctx.db.patch(inv._id, {
      status: 'success',
      paidAt: Date.now(),
      method: 'Stripe',
      gateway: 'stripe',
      checkoutSessionId: stripeSession.id,
      paymentIntentId: paymentIntentId(stripeSession),
      stripeAmount: stripeSession.amount_total ?? inv.stripeAmount,
      stripeCurrency: stripeSession.currency ?? inv.stripeCurrency,
      stripeEventId,
    });

    const user = await ctx.db.get(inv.userId);
    if (!user) return;

    let ledgerType = 'Hisob toldirish';
    if (inv.purpose === 'promote' && inv.listingId && inv.tier) {
      const settings = await ctx.db.query('settings').first();
      const days = settings?.feedBoostDays ?? 28;
      await ctx.db.patch(inv.listingId, {
        tier: inv.tier,
        boostedUntil: Date.now() + days * DAY_MS,
      });
      ledgerType = `Reklama: ${inv.tier.toUpperCase()}`;
    } else {
      await ctx.db.patch(inv.userId, { balance: (user.balance ?? 0) + inv.amount });
    }

    await ctx.db.insert('payments', {
      user: user.name,
      type: ledgerType,
      method: methodLabel(inv.method),
      amount: `${inv.amount.toLocaleString('ru-RU')} som`,
      date: new Date().toLocaleDateString('ru-RU'),
      status: 'success',
    });
  },
});

/** Compatibility for old internal callers. Prefer reconcilePaidSession. */
export const markPaid = internalMutation({
  args: {
    orderId: v.string(),
    method: v.optional(v.string()),
    transactionId: v.optional(v.number()),
  },
  handler: async (ctx, { orderId, method, transactionId }) => {
    const inv = await ctx.db
      .query('invoices')
      .withIndex('by_order', (q) => q.eq('orderId', orderId))
      .first();
    if (!inv || inv.status !== 'pending') return;
    await ctx.db.patch(inv._id, { status: 'success', paidAt: Date.now(), method, transactionId });
  },
});

export const settleStripe = internalMutation({
  args: {
    orderId: v.string(),
    status: invoiceStatus,
    stripeEventId: v.optional(v.string()),
  },
  handler: async (ctx, { orderId, status, stripeEventId }) => {
    if (status === 'failed' || status === 'cancelled') {
      await ctx.runMutation(internal.stripe.markStatus, { orderId, status, stripeEventId });
    }
  },
});

export const markStatus = internalMutation({
  args: { orderId: v.string(), status: invoiceStatus, stripeEventId: v.optional(v.string()) },
  handler: async (ctx, { orderId, status, stripeEventId }) => {
    const inv = await ctx.db
      .query('invoices')
      .withIndex('by_order', (q) => q.eq('orderId', orderId))
      .first();
    if (!inv || inv.status !== 'pending') return;
    await ctx.db.patch(inv._id, { status, stripeEventId });
  },
});

export const recordStripeEvent = internalMutation({
  args: {
    eventId: v.string(),
    type: v.string(),
    orderId: v.optional(v.string()),
  },
  handler: async (ctx, { eventId, type, orderId }) => {
    const existing = await ctx.db
      .query('stripeEvents')
      .withIndex('by_event', (q) => q.eq('eventId', eventId))
      .first();
    if (existing) return false;
    await ctx.db.insert('stripeEvents', {
      eventId,
      type,
      orderId,
      receivedAt: Date.now(),
      processedAt: Date.now(),
    });
    return true;
  },
});

export const handleWebhookEvent = internalMutation({
  args: { event: v.any() },
  handler: async (ctx, { event }) => {
    const stripeEvent = event as StripeEvent;
    const stripeObject = stripeEvent.data?.object;
    const eventId = stripeEvent.id;
    if (!eventId || !stripeObject?.id) return;

    const existing = await ctx.db
      .query('stripeEvents')
      .withIndex('by_event', (q) => q.eq('eventId', eventId))
      .first();
    if (existing) return;

    if (stripeEvent.type === 'checkout.session.completed' && 'payment_status' in stripeObject && stripeObject.payment_status === 'paid') {
      await ctx.runMutation(internal.stripe.reconcilePaidSession, {
        session: stripeObject,
        stripeEventId: eventId,
      });
    } else if (stripeEvent.type === 'checkout.session.expired') {
      await ctx.runMutation(internal.stripe.markStatus, {
        orderId: stripeObject.id,
        status: 'cancelled',
        stripeEventId: eventId,
      });
    } else if (stripeEvent.type === 'payment_intent.succeeded' && 'status' in stripeObject) {
      await ctx.runMutation(internal.stripe.reconcilePaidPaymentIntent, {
        intent: stripeObject,
        stripeEventId: eventId,
      });
    }

    await ctx.db.insert('stripeEvents', {
      eventId,
      type: stripeEvent.type,
      orderId: stripeObject.id,
      receivedAt: Date.now(),
      processedAt: Date.now(),
    });
  },
});

export const listInvoices = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query('invoices').collect();
    const sorted = rows.sort((a, b) => b.createdAt - a.createdAt);
    return Promise.all(
      sorted.map(async (inv) => {
        const [user, listing] = await Promise.all([
          ctx.db.get(inv.userId),
          inv.listingId ? ctx.db.get(inv.listingId) : Promise.resolve(null),
        ]);
        return {
          ...inv,
          userName: user?.name ?? 'Foydalanuvchi',
          userPhone: user?.phone ?? '',
          listingTitle: listing?.title ?? null,
        };
      })
    );
  },
});

export const byOrder = query({
  args: { orderId: v.string() },
  handler: async (ctx, { orderId }) => {
    const inv = await ctx.db
      .query('invoices')
      .withIndex('by_order', (q) => q.eq('orderId', orderId))
      .first();
    return inv ? { status: inv.status, amount: inv.amount } : null;
  },
});
