import { v } from 'convex/values';
import { mutation } from './_generated/server';

// STREAM_API_SECRET is set server-side only (never shipped to the client):
//   npx convex env set STREAM_API_SECRET <secret>
declare const process: { env: Record<string, string | undefined> };

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** URL-safe base64 (no padding) — for JWT segments. */
function b64url(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
  }
  const rem = bytes.length - i;
  if (rem === 1) {
    const n = bytes[i] << 16;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
  } else if (rem === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63];
  }
  return out;
}

const bytes = (s: string) => new TextEncoder().encode(s);

/** Sign `${header}.${payload}` with HMAC-SHA256 (Stream tokens are HS256 JWTs). */
async function hs256(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    bytes(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, bytes(data));
  return b64url(new Uint8Array(sig));
}

/**
 * Mint a Stream user token for chat + video. The client wires this as its
 * `tokenProvider`, so tokens can be short-lived and refreshed on expiry.
 *
 * NOTE: our auth is currently client-trusted (the app supplies its own userId),
 * so this endpoint trusts the caller-supplied id — the same limitation as the
 * rest of the app's auth. Harden alongside real server sessions later.
 */
export const token = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const secret = process.env.STREAM_API_SECRET;
    if (!secret) throw new Error('STREAM_API_SECRET is not set on the Convex deployment');

    const user = await ctx.db.get(userId);
    if (!user) throw new Error('Foydalanuvchi topilmadi');
    if (user.status === 'blocked') throw new Error('Hisobingiz bloklangan');

    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 24 * 60 * 60; // 24h; client refreshes via tokenProvider
    const header = b64url(bytes(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
    const payload = b64url(bytes(JSON.stringify({ user_id: userId, iat, exp })));
    const data = `${header}.${payload}`;
    const sig = await hs256(data, secret);
    return { token: `${data}.${sig}`, userId, name: user.name };
  },
});
