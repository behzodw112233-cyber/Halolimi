import { mutation } from './_generated/server';
import { enforceRateLimit } from './rateLimit';

/**
 * Returns a short-lived URL the client POSTs a file to. The POST response
 * contains a `storageId` that gets saved on the listing (see listings.create).
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await enforceRateLimit(ctx, 'uploadUrlGlobal', 'global');
    return await ctx.storage.generateUploadUrl();
  },
});
