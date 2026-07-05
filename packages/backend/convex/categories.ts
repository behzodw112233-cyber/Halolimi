import { query } from './_generated/server';

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query('categories').collect();
    return rows.sort((a, b) => a.order - b.order);
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
