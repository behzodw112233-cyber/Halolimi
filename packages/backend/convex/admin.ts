import { v } from 'convex/values';
import { query } from './_generated/server';

// Convex's TS config doesn't pull in @types/node, so `process` is untyped here.
// It IS available at runtime inside Convex functions — declare it for the compiler.
declare const process: { env: Record<string, string | undefined> };

/**
 * Admin panel password gate. The password is read from the Convex env var
 * `ADMIN_PASSWORD` (set it with `npx convex env set ADMIN_PASSWORD <value>`);
 * falls back to 'halolmi' if unset so the panel works out of the box.
 *
 * This is a lightweight gate for an internal tool — the secret is verified
 * server-side, never shipped to the browser. For multi-admin / audited access
 * upgrade to Convex Auth later.
 */
export const check = query({
  args: { password: v.string() },
  handler: (_ctx, { password }) => {
    const expected = process.env.ADMIN_PASSWORD || 'halolmi';
    return password === expected;
  },
});
