import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const list = query({
  args: {},
  handler: (ctx) => ctx.db.query('reports').collect(),
});

export const resolve = mutation({
  args: { id: v.id('reports') },
  handler: (ctx, { id }) => ctx.db.patch(id, { status: 'resolved' }),
});
