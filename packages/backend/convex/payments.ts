import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { paymentStatus } from './schema';

export const list = query({
  args: {},
  handler: (ctx) => ctx.db.query('payments').collect(),
});

export const setStatus = mutation({
  args: { id: v.id('payments'), status: paymentStatus },
  handler: (ctx, { id, status }) => ctx.db.patch(id, { status }),
});

export const remove = mutation({
  args: { id: v.id('payments') },
  handler: (ctx, { id }) => ctx.db.delete(id),
});
