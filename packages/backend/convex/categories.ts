import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Built-in breed/type lists per category. Served when a category has no
 * admin-set `breeds`, so the app always has sensible options out of the box.
 * Once an admin edits a category's breeds, that list wins.
 */
const DEFAULT_BREEDS: Record<string, string[]> = {
  cattle: ['Golshteyn', 'Simmental', 'Shvits', 'Qora-ola', 'Angus', 'Jersey', 'Mahalliy zot'],
  sheep: ['Hisor', 'Qorakoʻl', 'Jaydari', 'Merinos', 'Edilboy', 'Mahalliy'],
  horses: ['Qorabayir', 'Oʻrta Osiyo', 'Arab', 'Yorgʻa', 'Toy zoti'],
  poultry: ['Broyler', 'Tuxum tovuq', 'Mahalliy tovuq', 'Kurka', 'Oʻrdak', 'Gʻoz'],
  pets: ['It', 'Mushuk', 'Toʻtiqush', 'Dekorativ', 'Boshqa'],
  rabbits: ['Kaliforniya', 'Serebro', 'Flandr', 'Mahalliy'],
  fish: ['Akvarium baliqlari', 'Tovus baliq', 'Guppi', 'Boshqa'],
  supplies: ['Yem-xashak', 'Anjomlar', 'Dori-darmon', 'Boshqa'],
};

/** Resolve a category's breeds: admin-set list if any, otherwise the defaults. */
const breedsFor = (c: { slug: string; breeds?: string[] }) =>
  c.breeds && c.breeds.length ? c.breeds : DEFAULT_BREEDS[c.slug] ?? [];

/** Active categories only — consumed by the app sell grid and the bot. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query('categories').collect();
    return rows
      .filter((c) => c.active)
      .sort((a, b) => a.order - b.order)
      .map((c) => ({ ...c, breeds: breedsFor(c) }));
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
      breeds: breedsFor(c),
      count: listings.filter((l) => l.category === c.slug).length,
    }));
  },
});

/** Replace a category's breed/type list (admin panel). Blanks/dupes are dropped. */
export const setBreeds = mutation({
  args: { id: v.id('categories'), breeds: v.array(v.string()) },
  handler: async (ctx, { id, breeds }) => {
    const cleaned = breeds
      .map((b) => b.trim())
      .filter((b) => b.length > 0)
      .filter((b, i, arr) => arr.indexOf(b) === i);
    await ctx.db.patch(id, { breeds: cleaned });
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
