import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { userStatus } from './schema';

export const list = query({
  args: {},
  handler: (ctx) => ctx.db.query('users').collect(),
});

export const setStatus = mutation({
  args: { id: v.id('users'), status: userStatus },
  handler: (ctx, { id, status }) => ctx.db.patch(id, { status }),
});
