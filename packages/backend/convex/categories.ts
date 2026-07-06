import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/** Active categories only — consumed by the app sell grid and the bot. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query('categories').collect();
    return rows.filter((c) => c.active).sort((a, b) => a.order - b.order);
  },
});

/** Categories with a live listing count per slug (for the admin panel). */
export const withCounts = query({
  args: {},
  handler: async (ctx) => {
    const cats = (await ctx.db.query('categories').collect()).sort((a, b) => a.order - b.order);
    const listings = await ctx.db.query('listings').collect();
    return cats.map((c) => ({
      ...c,
      count: listings.filter((l) => l.category === c.slug).length,
    }));
  },
});

export const create = mutation({
  args: { slug: v.string(), name: v.string(), emoji: v.string() },
  handler: async (ctx, { slug, name, emoji }) => {
    const existing = await ctx.db
      .query('categories')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .first();
    if (existing) throw new Error('Bu slug allaqachon mavjud');
    const all = await ctx.db.query('categories').collect();
    const order = all.reduce((m, c) => Math.max(m, c.order), -1) + 1;
    return await ctx.db.insert('categories', { slug, name, emoji, order, active: true });
  },
});

export const setActive = mutation({
  args: { id: v.id('categories'), active: v.boolean() },
  handler: (ctx, { id, active }) => ctx.db.patch(id, { active }),
});

export const remove = mutation({
  args: { id: v.id('categories') },
  handler: (ctx, { id }) => ctx.db.delete(id),
});
