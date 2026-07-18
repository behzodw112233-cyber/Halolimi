import { v } from 'convex/values';
import { action } from './_generated/server';

declare const process: { env: Record<string, string | undefined> };

const DEFAULT_TTL_SECONDS = 86_400;
const MAX_TTL_SECONDS = 86_400;

type CloudflareIceServer = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

type CloudflareTurnResponse = {
  iceServers?: CloudflareIceServer[];
  errors?: { message?: string }[];
};

function turnConfig() {
  const tokenId = process.env.CLOUDFLARE_TURN_TOKEN_ID;
  const apiToken = process.env.CLOUDFLARE_TURN_API_TOKEN;
  if (!tokenId || !apiToken) {
    throw new Error('Cloudflare TURN is not configured');
  }
  return { tokenId, apiToken };
}

export const generateIceServers = action({
  args: { ttlSeconds: v.optional(v.number()) },
  handler: async (_ctx, { ttlSeconds }) => {
    const { tokenId, apiToken } = turnConfig();
    const ttl = Math.max(60, Math.min(ttlSeconds ?? DEFAULT_TTL_SECONDS, MAX_TTL_SECONDS));
    const res = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${tokenId}/credentials/generate-ice-servers`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ttl }),
      }
    );
    const data = (await res.json()) as CloudflareTurnResponse;
    if (!res.ok || !data.iceServers?.length) {
      const message = data.errors?.[0]?.message ?? 'Cloudflare TURN credentials failed';
      throw new Error(message);
    }
    return { iceServers: data.iceServers };
  },
});
