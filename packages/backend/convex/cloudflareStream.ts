import { v } from 'convex/values';
import { action } from './_generated/server';

declare const process: { env: Record<string, string | undefined> };

type DirectUploadResponse = {
  success?: boolean;
  result?: {
    uploadURL?: string;
    uid?: string;
  };
  errors?: { message?: string }[];
};

function streamConfig() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_STREAM_API_TOKEN;
  if (!accountId || !token) {
    throw new Error('Cloudflare Stream is not configured');
  }
  return { accountId, token };
}

function playbackBase() {
  return (
    process.env.CLOUDFLARE_STREAM_PLAYBACK_BASE?.replace(/\/$/, '') ??
    'https://videodelivery.net'
  );
}

export const createDirectUpload = action({
  args: { maxDurationSeconds: v.optional(v.number()) },
  handler: async (_ctx, { maxDurationSeconds }) => {
    const { accountId, token } = streamConfig();
    const reservedSeconds = Math.max(5, Math.min(maxDurationSeconds ?? 60, 600));
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maxDurationSeconds: reservedSeconds,
        }),
      }
    );
    const data = (await res.json()) as DirectUploadResponse;
    if (!res.ok || !data.success || !data.result?.uploadURL || !data.result.uid) {
      const message = data.errors?.[0]?.message ?? 'Cloudflare Stream upload URL failed';
      throw new Error(message);
    }
    const base = playbackBase();
    return {
      uid: data.result.uid,
      uploadUrl: data.result.uploadURL,
      hlsUrl: `${base}/${data.result.uid}/manifest/video.m3u8`,
      thumbnailUrl: `${base}/${data.result.uid}/thumbnails/thumbnail.jpg`,
    };
  },
});
