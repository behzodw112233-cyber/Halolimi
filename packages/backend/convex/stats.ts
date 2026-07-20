import { query } from './_generated/server';

// ---- date bucketing helpers (all derived from real timestamps) ----

const UZ_WEEKDAY = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh']; // Date.getDay() 0..6
const UZ_MONTH = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

const toDigits = (s: string) => parseInt(s.replace(/\D/g, ''), 10) || 0;
const dayKey = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/** Buckets the given (timestamp, value) pairs into the last 7 calendar days. */
function last7(pairs: { ts: number; v?: number }[]) {
  const now = new Date();
  const buckets: { x: string; v: number }[] = [];
  const index: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    index[`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`] = buckets.length;
    buckets.push({ x: UZ_WEEKDAY[d.getDay()], v: 0 });
  }
  for (const p of pairs) {
    const slot = index[dayKey(p.ts)];
    if (slot !== undefined) buckets[slot].v += p.v ?? 1;
  }
  return buckets;
}

/** Cumulative count per month for the last 6 months. */
function last6Months(tsList: number[]) {
  const now = new Date();
  const buckets: { x: string; v: number }[] = [];
  const index: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    index[`${d.getFullYear()}-${d.getMonth()}`] = buckets.length;
    buckets.push({ x: UZ_MONTH[d.getMonth()], v: 0 });
  }
  for (const ts of tsList) {
    const d = new Date(ts);
    const slot = index[`${d.getFullYear()}-${d.getMonth()}`];
    if (slot !== undefined) buckets[slot].v += 1;
  }
  return buckets;
}

/** Everything the admin dashboards need — computed live from the database. */
export const overview = query({
  args: {},
  handler: async (ctx) => {
    const [listings, users, reports, payments, ads, invoices] = await Promise.all([
      ctx.db.query('listings').collect(),
      ctx.db.query('users').collect(),
      ctx.db.query('reports').collect(),
      ctx.db.query('payments').collect(),
      ctx.db.query('ads').collect(),
      ctx.db.query('invoices').collect(),
    ]);

    // --- totals ---
    const active = listings.filter((l) => l.status === 'active').length;
    const pending = listings.filter((l) => l.status === 'pending').length;
    const rejected = listings.filter((l) => l.status === 'rejected').length;
    const blocked = users.filter((u) => u.status === 'blocked').length;
    const reportsNew = reports.filter((r) => r.status === 'new').length;

    const okPayments = payments.filter((p) => p.status === 'success');
    const successfulInvoices = invoices.filter((i) => i.status === 'success');
    const pendingInvoices = invoices.filter((i) => i.status === 'pending');
    const revenueInvoices = successfulInvoices.filter((i) => i.purpose === 'promote');
    const topupInvoices = successfulInvoices.filter((i) => i.purpose === 'topup');
    const revenue = revenueInvoices.reduce((s, i) => s + i.amount, 0);
    const walletTopups = topupInvoices.reduce((s, i) => s + i.amount, 0);
    const walletLiability = users.reduce((s, u) => s + (u.balance ?? 0), 0);
    const stripeCashIn = successfulInvoices
      .filter((i) => i.gateway === 'stripe')
      .reduce((s, i) => s + i.amount, 0);
    const walletRevenue = revenueInvoices
      .filter((i) => i.gateway === 'wallet' || i.method === 'Wallet')
      .reduce((s, i) => s + i.amount, 0);
    const stripeRevenue = revenueInvoices
      .filter((i) => i.gateway === 'stripe')
      .reduce((s, i) => s + i.amount, 0);
    const startOfToday = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
    const revenueToday = revenueInvoices
      .filter((i) => (i.paidAt ?? i.createdAt) >= startOfToday)
      .reduce((s, i) => s + i.amount, 0);

    // --- listings by category ---
    const catMap = new Map<string, number>();
    for (const l of listings) catMap.set(l.category, (catMap.get(l.category) ?? 0) + 1);
    const byCategory = [...catMap.entries()]
      .map(([slug, count]) => ({ slug, count }))
      .sort((a, b) => b.count - a.count);

    // --- category → status matrix (for the sankey) ---
    const categoryStatus = [...catMap.keys()].map((slug) => {
      const rows = listings.filter((l) => l.category === slug);
      return {
        slug,
        active: rows.filter((l) => l.status === 'active').length,
        pending: rows.filter((l) => l.status === 'pending').length,
        rejected: rows.filter((l) => l.status === 'rejected').length,
      };
    });

    // --- report reasons ---
    const reasonMap = new Map<string, number>();
    for (const r of reports) reasonMap.set(r.reason, (reasonMap.get(r.reason) ?? 0) + 1);
    const reportReasons = [...reasonMap.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    // --- payment methods ---
    const methodMap = new Map<string, { count: number; amount: number }>();
    for (const i of successfulInvoices) {
      const method = i.method ?? i.gateway ?? 'Unknown';
      const cur = methodMap.get(method) ?? { count: 0, amount: 0 };
      cur.count += 1;
      cur.amount += i.amount;
      methodMap.set(method, cur);
    }
    const paymentMethods = [...methodMap.entries()].map(([method, v]) => ({ method, ...v }));

    // --- ad aggregates ---
    const adPlacements = {
      app: ads.filter((a) => a.placements.includes('app')).length,
      bot: ads.filter((a) => a.placements.includes('bot')).length,
    };
    const adsByCampaign = ads.map((a) => ({ x: a.advertiser, v: a.impressions }));

    return {
      totals: {
        listings: listings.length,
        active,
        pending,
        rejected,
        users: users.length,
        blocked,
        reportsNew,
        reports: reports.length,
        payments: payments.length,
        revenue,
        revenueToday,
      },
      money: {
        revenue,
        revenueToday,
        walletTopups,
        walletLiability,
        stripeCashIn,
        stripeRevenue,
        walletRevenue,
        pendingAmount: pendingInvoices.reduce((s, i) => s + i.amount, 0),
        pendingInvoices: pendingInvoices.length,
        paidInvoices: successfulInvoices.length,
        failedInvoices: invoices.filter((i) => i.status === 'failed' || i.status === 'cancelled').length,
        promoteInvoices: revenueInvoices.length,
        topupInvoices: topupInvoices.length,
      },
      byCategory,
      byStatus: { active, pending, rejected },
      categoryStatus,
      userActivity: { active: users.length - blocked, blocked },
      reportReasons,
      paymentMethods,
      adPlacements,
      adsByCampaign,
      ads: {
        active: ads.filter((a) => a.status === 'active').length,
        impressions: ads.reduce((s, a) => s + a.impressions, 0),
        clicks: ads.reduce((s, a) => s + a.clicks, 0),
        spent: ads.reduce((s, a) => s + a.spent, 0),
      },
      daily: {
        listings: last7(listings.map((l) => ({ ts: l.createdAt }))),
        moderated: last7(
          listings.filter((l) => l.status !== 'pending').map((l) => ({ ts: l.createdAt }))
        ),
        reports: last7(reports.map((r) => ({ ts: r._creationTime }))),
        // revenue per day in thousands of soʻm
        revenue: last7(
          revenueInvoices.map((i) => ({ ts: i.paidAt ?? i.createdAt, v: i.amount / 1000 }))
        ),
        topups: last7(
          topupInvoices.map((i) => ({ ts: i.paidAt ?? i.createdAt, v: i.amount / 1000 }))
        ),
      },
      usersMonthly: last6Months(users.map((u) => u._creationTime)),
    };
  },
});
