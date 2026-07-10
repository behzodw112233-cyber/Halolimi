import { v } from 'convex/values';
import {
  mutation,
  internalAction,
  internalMutation,
  internalQuery,
} from './_generated/server';
import { internal } from './_generated/api';

// FCM_SERVICE_ACCOUNT holds the Firebase service-account JSON (the private key
// file), set server-side only:
//   npx convex env set FCM_SERVICE_ACCOUNT "$(cat service-account.json)"
declare const process: { env: Record<string, string | undefined> };

const B64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** URL-safe base64 (no padding) — for JWT segments. */
function b64url(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += B64URL[(n >> 18) & 63] + B64URL[(n >> 12) & 63] + B64URL[(n >> 6) & 63] + B64URL[n & 63];
  }
  const rem = bytes.length - i;
  if (rem === 1) {
    const n = bytes[i] << 16;
    out += B64URL[(n >> 18) & 63] + B64URL[(n >> 12) & 63];
  } else if (rem === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += B64URL[(n >> 18) & 63] + B64URL[(n >> 12) & 63] + B64URL[(n >> 6) & 63];
  }
  return out;
}

const enc = (s: string) => new TextEncoder().encode(s);

/** Decode a PEM private key body into DER bytes for crypto.subtle. */
function pemToDer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s+/g, '');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

/**
 * Mint a short-lived Google OAuth2 access token from the service account, scoped
 * to FCM. We sign a JWT (RS256) with the account's private key and exchange it.
 */
async function fcmAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(enc(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claims = b64url(
    enc(
      JSON.stringify({
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      })
    )
  );
  const unsigned = `${header}.${claims}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc(unsigned));
  const jwt = `${unsigned}.${b64url(new Uint8Array(sig))}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error('FCM OAuth failed');
  return json.access_token;
}

/**
 * Register (or refresh) the FCM device token for the signed-in device. Called on
 * app start once we have permission + a userId. Keyed by token so re-installing
 * or switching accounts on the same device just re-points the row.
 */
export const registerToken = mutation({
  args: { userId: v.id('users'), token: v.string() },
  handler: async (ctx, { userId, token }) => {
    const existing = await ctx.db
      .query('pushTokens')
      .withIndex('by_token', (q) => q.eq('token', token))
      .first();
    if (existing) {
      if (existing.userId !== userId || existing.updatedAt < Date.now() - 60_000) {
        await ctx.db.patch(existing._id, { userId, updatedAt: Date.now() });
      }
      return;
    }
    await ctx.db.insert('pushTokens', { userId, token, updatedAt: Date.now() });
  },
});

/** Drop a token (e.g. on logout) so the device stops getting that user's pushes. */
export const removeToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const row = await ctx.db
      .query('pushTokens')
      .withIndex('by_token', (q) => q.eq('token', token))
      .first();
    if (row) await ctx.db.delete(row._id);
  },
});

/** All push tokens for a user (across their devices). */
export const tokensForUser = internalQuery({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const rows = await ctx.db
      .query('pushTokens')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    return rows.map((r) => r.token);
  },
});

/** Remove a token FCM reported as dead (uninstalled / invalid). */
export const dropDeadToken = internalMutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const row = await ctx.db
      .query('pushTokens')
      .withIndex('by_token', (q) => q.eq('token', token))
      .first();
    if (row) await ctx.db.delete(row._id);
  },
});

/**
 * Send a push to every device a user owns, via Firebase Cloud Messaging (HTTP
 * v1). Scheduled from mutations with ctx.scheduler.runAfter(0, internal.push.send)
 * so the triggering write stays a pure mutation while the network call runs here.
 */
export const send = internalAction({
  args: {
    userId: v.id('users'),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
  },
  handler: async (ctx, { userId, title, body, data }) => {
    const raw = process.env.FCM_SERVICE_ACCOUNT;
    if (!raw) return; // not configured yet — skip silently
    const tokens: string[] = await ctx.runQuery(internal.push.tokensForUser, { userId });
    if (tokens.length === 0) return;

    let sa: ServiceAccount;
    let accessToken: string;
    try {
      sa = JSON.parse(raw) as ServiceAccount;
      accessToken = await fcmAccessToken(sa);
    } catch {
      return; // bad credentials or OAuth hiccup — a missed push isn't fatal
    }

    // FCM data values must be strings.
    const stringData: Record<string, string> = {};
    for (const [k, val] of Object.entries((data ?? {}) as Record<string, unknown>)) {
      stringData[k] = typeof val === 'string' ? val : String(val);
    }

    const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
    await Promise.all(
      tokens.map(async (token) => {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: {
                token,
                notification: { title, body },
                data: stringData,
                android: {
                  priority: 'HIGH',
                  notification: { channel_id: 'default', sound: 'default' },
                },
              },
            }),
          });
          if (res.status === 404 || res.status === 400) {
            // UNREGISTERED / invalid token → prune to keep fan-outs cheap.
            const j = (await res.json().catch(() => null)) as
              | { error?: { status?: string } }
              | null;
            const status = j?.error?.status;
            if (res.status === 404 || status === 'UNREGISTERED' || status === 'INVALID_ARGUMENT') {
              await ctx.runMutation(internal.push.dropDeadToken, { token });
            }
          }
        } catch {
          /* network hiccup — ignore this device */
        }
      })
    );
  },
});
