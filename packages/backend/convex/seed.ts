import { mutation, type MutationCtx } from './_generated/server';

// Real structural data only. NO fake listings / ads / users / reports / payments —
// those are created by real users through the app, bot, and admin panel.

const CATEGORIES = [
  { slug: 'cattle', name: 'Qoramol', emoji: '🐄', order: 0 },
  { slug: 'sheep', name: 'Qoʻy va echkilar', emoji: '🐑', order: 1 },
  { slug: 'horses', name: 'Otlar', emoji: '🐎', order: 2 },
  { slug: 'poultry', name: 'Parrandalar', emoji: '🐔', order: 3 },
  { slug: 'pets', name: 'Uy hayvonlari', emoji: '🐕', order: 4 },
  { slug: 'rabbits', name: 'Quyonlar', emoji: '🐇', order: 5 },
];

// Welcome announcements — real product content shown to every user.
const NOTIFICATIONS = [
  { icon: 'sparkles', title: 'Halolmiga xush kelibsiz! 🎉', body: 'Hayvonlaringizni oson va tez soting — birinchi eʼloningizni joylang.' },
  { icon: 'megaphone-outline', title: 'Bepul eʼlon joylash', body: 'Hozir eʼlon joylashtirish mutlaqo bepul. Imkoniyatdan foydalaning!' },
  { icon: 'bulb-outline', title: 'Maslahat', body: 'Sifatli rasmlar qoʻshsangiz, hayvoningiz tezroq sotiladi.' },
];

const ALL_TABLES = [
  'categories', 'listings', 'ads', 'users', 'reports',
  'payments', 'notifications', 'messages', 'saved',
] as const;

async function clearAll(ctx: MutationCtx) {
  for (const table of ALL_TABLES) {
    const rows = await ctx.db.query(table).collect();
    await Promise.all(rows.map((r) => ctx.db.delete(r._id)));
  }
}

/**
 * Set up the deployment with only the real category taxonomy + welcome
 * notifications. Clears every table first, so re-running wipes any leftover
 * data. Produces a clean, empty marketplace ready for real users.
 */
export const run = mutation({
  args: {},
  handler: async (ctx) => {
    await clearAll(ctx);
    for (const c of CATEGORIES) await ctx.db.insert('categories', { ...c, active: true });
    let n = Date.now();
    for (const notif of NOTIFICATIONS) await ctx.db.insert('notifications', { ...notif, createdAt: n-- });
    return { categories: CATEGORIES.length, notifications: NOTIFICATIONS.length };
  },
});

/** Wipe EVERYTHING, including categories. Leaves a completely empty database. */
export const reset = mutation({
  args: {},
  handler: async (ctx) => {
    await clearAll(ctx);
    return { cleared: true };
  },
});
