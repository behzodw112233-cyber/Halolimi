import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { userStatus } from './schema';

export const list = query({
  args: {},
  handler: (ctx) => ctx.db.query('users').collect(),
});

export const get = query({
  args: { id: v.id('users') },
  handler: (ctx, { id }) => ctx.db.get(id),
});

/** Lightweight phone "login": find-or-create a user, returns the id. */
export const getOrCreate = mutation({
  args: { phone: v.string(), name: v.optional(v.string()) },
  handler: async (ctx, { phone, name }) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_phone', (q) => q.eq('phone', phone))
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert('users', {
      name: name?.trim() || 'Foydalanuvchi',
      phone,
      listings: 0,
      joined: new Date().toLocaleDateString('ru-RU'),
      status: 'active',
    });
  },
});

export const setStatus = mutation({
  args: { id: v.id('users'), status: userStatus },
  handler: (ctx, { id, status }) => ctx.db.patch(id, { status }),
});

export const remove = mutation({
  args: { id: v.id('users') },
  handler: (ctx, { id }) => ctx.db.delete(id),
});
