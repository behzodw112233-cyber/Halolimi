import { query } from './_generated/server';

/** Global announcements, newest first. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query('notifications').collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});
