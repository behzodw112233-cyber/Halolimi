import { v } from 'convex/values';
import { mutation, type MutationCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';

const USER_DATA_TABLES = [
  'listings',
  'ads',
  'dealers',
  'reels',
  'reelLikes',
  'reelSaves',
  'reelComments',
  'users',
  'reviews',
  'follows',
  'messages',
  'threads',
  'calls',
  'callCandidates',
  'threadMembers',
  'saved',
  'pushTokens',
  'authSessions',
  'reports',
  'payments',
  'plans',
  'leads',
  'invoices',
] as const;

async function clearTable(ctx: MutationCtx, table: (typeof USER_DATA_TABLES)[number]) {
  const rows = await ctx.db.query(table).collect();
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length;
}

async function deleteStorage(ctx: MutationCtx, ids: Set<Id<'_storage'>>) {
  let deleted = 0;
  for (const id of ids) {
    try {
      await ctx.storage.delete(id);
      deleted++;
    } catch {
      // Already gone or not deletable; keep wiping DB rows.
    }
  }
  return deleted;
}

async function wipeUserGeneratedData(ctx: MutationCtx) {
    const storageIds = new Set<Id<'_storage'>>();
    const listings = await ctx.db.query('listings').collect();
    for (const listing of listings) {
      for (const photo of listing.photos ?? []) storageIds.add(photo);
    }

    const dealers = await ctx.db.query('dealers').collect();
    for (const dealer of dealers) {
      if (dealer.videoId) storageIds.add(dealer.videoId);
      if (dealer.thumbId) storageIds.add(dealer.thumbId);
    }

    const reels = await ctx.db.query('reels').collect();
    for (const reel of reels) {
      if (reel.videoId) storageIds.add(reel.videoId);
      if (reel.thumbId) storageIds.add(reel.thumbId);
    }

    const users = await ctx.db.query('users').collect();
    for (const user of users) {
      if (user.avatar) storageIds.add(user.avatar);
    }

    const messages = await ctx.db.query('messages').collect();
    for (const message of messages) {
      if (message.imageId) storageIds.add(message.imageId);
      if (message.audioId) storageIds.add(message.audioId);
    }

    const counts: Record<string, number> = {};
    for (const table of USER_DATA_TABLES) {
      counts[table] = await clearTable(ctx, table);
    }

    return {
      counts,
      storageDeleted: await deleteStorage(ctx, storageIds),
      storageFound: storageIds.size,
    };
}

/**
 * Dev cleanup: remove uploaded/user-generated marketplace data while keeping
 * structural app config such as categories, settings, and welcome notifications.
 */
export const wipeUserData = mutation({
  args: {
    confirm: v.string(),
  },
  handler: async (ctx, { confirm }) => {
    if (confirm !== 'WIPE_USER_DATA') throw new Error('Confirmation mismatch');
    return await wipeUserGeneratedData(ctx);
  },
});
