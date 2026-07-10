import { v } from 'convex/values';
import {
  action,
  internalAction,
  internalMutation,
  query,
} from './_generated/server';
import { internal } from './_generated/api';
import { invoiceStatus, listingTier } from './schema';

// Merchant credentials live only on the Convex deployment:
//   npx convex env set INPAY_MERCHANT_ID <id>
//   npx convex env set INPAY_MERCHANT_TOKEN <token>
declare const process: { env: Record<string, string | undefined> };

const BASE = 'https://inpay.uz/api/v1';
const MIN_AMOUNT = 1000;

// Shapes of the inPAY API responses we consume.
interface InpayAuthResponse {
  success?: boolean;
  bearer_token?: string;
  message?: string;
}
interface InpayCreateResponse {
  success?: boolean;
  order_id?: string;
  pay_url?: string;
  message?: string;
  error_code?: string;
}
interface InpayTransactionResponse {
  success?: boolean;
  status?: string;
  payment_method?: string;
}
const DAY_MS = 24 * 60 * 60 * 1000;

// Authoritative promotion prices (UZS). The client never sends the amount for a
// promotion — the tier maps to a price here so it can't be tampered with.
const TIER_PRICE: Record<string, number> = {
  alo: 6000,
  zor: 29000,
  vip: 51000,
  lux: 102000,
};

/** Exchange merchant credentials for a 24h bearer token. */
async function authorize(): Promise<string> {
  const id = process.env.INPAY_MERCHANT_ID;
  const token = process.env.INPAY_MERCHANT_TOKEN;
  if (!id || !token) throw new Error('inPAY merchant credentials are not configured');
  const res = await fetch(
    `${BASE}/authorization/?merchant_id=${id}&merchant_token=${token}`,
    { headers: { Accept: 'application/json' } }
  );
  const data = (await res.json()) as InpayAuthResponse;
  if (!data?.success || !data?.bearer_token) {
    throw new Error(data?.message ?? 'inPAY authorization failed');
  }
  return data.bearer_token as string;
}

function createError(data: InpayCreateResponse) {
  const code = data.error_code ? `${data.error_code}: ` : '';
  return new Error(`${code}${data.message ?? 'inPAY payment create failed'}`);
}

function createMerchantId() {
  const id = process.env.INPAY_CREATE_MERCHANT_ID ?? process.env.INPAY_MERCHANT_ID;
  if (!id) throw new Error('INPAY_MERCHANT_ID is not configured');
  return id;
}

function callbackUrl() {
  const site = process.env.CONVEX_SITE_URL;
  if (!site) throw new Error('CONVEX_SITE_URL is not configured');
  return `${site.replace(/\/$/, '')}/inpay/callback`;
}

function normalizeMethod(method?: string) {
  if (!method || method === 'inPAY') return '';
  return method;
}

function normalizeInvoiceStatus(status?: string): 'success' | 'failed' | 'cancelled' | 'pending' | null {
  if (status === 'success') return 'success';
  if (status === 'failed') return 'failed';
  if (status === 'canceled' || status === 'cancelled') return 'cancelled';
  if (status === 'pending') return 'pending';
  return null;
}

/**
 * App entry point: create a top-up invoice and return the checkout URL. The app
 * opens `payUrl`; settlement happens later via the verified webhook.
 */
export const createInvoice = action({
  args: {
    userId: v.id('users'),
    amount: v.number(),
    method: v.optional(v.string()), // click | payme | inPAY
  },
  handler: async (ctx, { userId, amount, method }): Promise<{ orderId: string; payUrl: string }> => {
    if (!Number.isFinite(amount) || amount < MIN_AMOUNT) {
      throw new Error(`Minimal summa ${MIN_AMOUNT} soʻm`);
    }
    const bearer = await authorize();

    const res = await fetch(`${BASE}/create/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bearer}` },
      body: JSON.stringify({
        merchant_id: createMerchantId(),
        amount: Math.round(amount),
        description: 'Halolmi hisobini toʻldirish',
        payment_method: normalizeMethod(method),
        callback_url: callbackUrl(),
      }),
    });
    const data = (await res.json()) as InpayCreateResponse;
    if (!data.success || !data.pay_url || !data.order_id) {
      throw createError(data);
    }

    await ctx.runMutation(internal.inpay.createPending, {
      orderId: data.order_id,
      userId,
      amount: Math.round(amount),
      method: methodLabel(method),
      payUrl: data.pay_url,
    });
    return { orderId: data.order_id as string, payUrl: data.pay_url as string };
  },
});

export const createPending = internalMutation({
  args: {
    orderId: v.string(),
    userId: v.id('users'),
    amount: v.number(),
    method: v.string(),
    payUrl: v.string(),
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

/**
 * App: pay to promote a listing. Price is derived from the tier server-side.
 * On the verified webhook, the boost is applied automatically (see markPaid).
 */
export const createPromoteInvoice = action({
  args: {
    userId: v.id('users'),
    listingId: v.id('listings'),
    tier: listingTier,
    method: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { userId, listingId, tier, method }
  ): Promise<{ orderId: string; payUrl: string }> => {
    const amount = TIER_PRICE[tier];
    if (!amount) throw new Error('Nomaʼlum tarif');
    const bearer = await authorize();

    const res = await fetch(`${BASE}/create/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bearer}` },
      body: JSON.stringify({
        merchant_id: createMerchantId(),
        amount,
        description: `Reklama: ${tier.toUpperCase()}`,
        payment_method: normalizeMethod(method),
        callback_url: callbackUrl(),
      }),
    });
    const data = (await res.json()) as InpayCreateResponse;
    if (!data.success || !data.pay_url || !data.order_id) {
      throw createError(data);
    }

    await ctx.runMutation(internal.inpay.createPending, {
      orderId: data.order_id,
      userId,
      amount,
      method: methodLabel(method),
      payUrl: data.pay_url,
      purpose: 'promote',
      listingId,
      tier,
    });
    return { orderId: data.order_id as string, payUrl: data.pay_url as string };
  },
});

/**
 * Webhook-driven settlement. inPAY's callback is unsigned, so we NEVER trust its
 * body — we re-fetch the authoritative status from /transactions and act on that.
 */
export const verifyAndSettle = internalAction({
  args: { orderId: v.string() },
  handler: async (ctx, { orderId }) => {
    const bearer = await authorize();
    const res = await fetch(`${BASE}/transactions/?order_id=${orderId}`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${bearer}` },
    });
    const data = (await res.json()) as InpayTransactionResponse;
    if (!data.success) return;
    const status = normalizeInvoiceStatus(data.status);
    if (status === 'success') {
      await ctx.runMutation(internal.inpay.markPaid, {
        orderId,
        method: typeof data.payment_method === 'string' ? data.payment_method : undefined,
      });
    } else if (status === 'failed' || status === 'cancelled') {
      await ctx.runMutation(internal.inpay.markStatus, { orderId, status });
    }
  },
});

// Normalize inPAY's method value to the label the admin ledger/colors expect.
const METHOD_LABEL: Record<string, string> = {
  click: 'Click',
  payme: 'Payme',
  uzcard: 'Uzcard',
  inpay: 'inPAY',
};
const methodLabel = (m?: string) =>
  (m ? METHOD_LABEL[m.toLowerCase()] ?? m : undefined) ?? 'inPAY';

/** Idempotently credit a verified top-up (only a still-pending invoice pays out). */
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
    if (!inv || inv.status !== 'pending') return; // already settled — no double credit
    await ctx.db.patch(inv._id, { status: 'success', paidAt: Date.now(), transactionId });

    const user = await ctx.db.get(inv.userId);
    if (!user) return;

    let ledgerType = 'Hisob toʻldirish';
    if (inv.purpose === 'promote' && inv.listingId && inv.tier) {
      // Apply the paid feed boost to the listing.
      const settings = await ctx.db.query('settings').first();
      const days = settings?.feedBoostDays ?? 28;
      await ctx.db.patch(inv.listingId, {
        tier: inv.tier,
        boostedUntil: Date.now() + days * DAY_MS,
      });
      ledgerType = `Reklama: ${inv.tier.toUpperCase()}`;
    } else {
      // Wallet top-up.
      await ctx.db.patch(inv.userId, { balance: (user.balance ?? 0) + inv.amount });
    }

    // Admin ledger row (method = the real gateway inPAY reported, capitalized).
    await ctx.db.insert('payments', {
      user: user.name,
      type: ledgerType,
      method: methodLabel(method ?? inv.method),
      amount: `${inv.amount.toLocaleString('ru-RU')} soʻm`,
      date: new Date().toLocaleDateString('ru-RU'),
      status: 'success',
    });
  },
});

export const markStatus = internalMutation({
  args: { orderId: v.string(), status: invoiceStatus },
  handler: async (ctx, { orderId, status }) => {
    const inv = await ctx.db
      .query('invoices')
      .withIndex('by_order', (q) => q.eq('orderId', orderId))
      .first();
    if (!inv || inv.status !== 'pending') return;
    await ctx.db.patch(inv._id, { status });
  },
});

/** Admin: live inPAY invoice list with user/listing display data. */
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

/** Admin: ask inPAY for the current status of a pending invoice. */
export const refreshInvoice = action({
  args: { orderId: v.string() },
  handler: async (ctx, { orderId }) => {
    await ctx.runAction(internal.inpay.verifyAndSettle, { orderId });
    return true;
  },
});

/** App polls this (reactively) to know when the top-up lands. */
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
