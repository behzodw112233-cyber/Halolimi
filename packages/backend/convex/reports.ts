import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const list = query({
  args: {},
  handler: (ctx) => ctx.db.query('reports').collect(),
});

/** In-app report submission: a user flags a listing → lands in admin Shikoyatlar. */
export const create = mutation({
  args: {
    listingTitle: v.string(),
    reason: v.string(),
    reporter: v.string(),
  },
  handler: (ctx, { listingTitle, reason, reporter }) =>
    ctx.db.insert('reports', {
      listingTitle,
      reason,
      reporter,
      date: new Date().toLocaleDateString('ru-RU'),
      status: 'new',
    }),
});

export const resolve = mutation({
  args: { id: v.id('reports') },
  handler: (ctx, { id }) => ctx.db.patch(id, { status: 'resolved' }),
});

export const remove = mutation({
  args: { id: v.id('reports') },
  handler: (ctx, { id }) => ctx.db.delete(id),
});
