import { v } from 'convex/values';
import { internal } from './_generated/api';
import { action, internalMutation, mutation, query } from './_generated/server';
import { bountySubmissionStatus } from './schema';

declare const process: { env: Record<string, string | undefined> };

const PAYOUT_TIERS = [
  { views: 10_000, cents: 100 },
  { views: 50_000, cents: 500 },
  { views: 100_000, cents: 1_200 },
  { views: 250_000, cents: 3_500 },
  { views: 500_000, cents: 8_500 },
  { views: 1_000_000, cents: 20_000 },
  { views: 5_000_000, cents: 125_000 },
] as const;

const MAX_VIEW_COUNT = 100_000_000;
const MAX_INSTALL_COUNT = 20_000;
const MAX_ACTIVATION_COUNT = 5_000;
const MAX_MULTIPLIER = 1.5;
const MAX_URL_LENGTH = 2_048;

const CAMPAIGNS = [
  {
    slug: 'farmers-sell-faster',
    title: 'Farmers sell faster',
    tag: 'Main campaign',
    brief: 'Show sellers how Halolmia replaces messy groups with listings, chat, calls, and trust.',
    hook: 'Still selling animals in Telegram groups? Show Halolmia in 20 seconds.',
    targetViews: 100_000,
    accent: '#12A8E8',
    status: 'active',
  },
  {
    slug: 'buyer-seller-skit',
    title: 'Buyer/seller skit',
    tag: 'Comedy format',
    brief: 'Act out the chaos of repeated DMs, then switch to a clean Halolmia listing.',
    hook: 'Buyer asks the same questions again and again. Halolmia fixes it.',
    targetViews: 250_000,
    accent: '#111827',
    status: 'active',
  },
  {
    slug: 'dealer-trust-badge',
    title: 'Dealer trust badge',
    tag: 'Trust format',
    brief: 'Explain verified sellers, reviews, calls, and why buyers feel safer.',
    hook: 'Would you buy from a stranger or a verified seller?',
    targetViews: 50_000,
    accent: '#F35B7F',
    status: 'active',
  },
] as const;

function normalizePhone(phone: string) {
  const normalized = phone.replace(/[^\d+]/g, '').trim();
  if (normalized.length < 7) throw new Error('A valid phone number is required');
  return normalized;
}

function normalizeUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) throw new Error('Video URL is required');
  if (trimmed.length > MAX_URL_LENGTH) throw new Error('Video URL is too long');
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withProtocol);
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Video URL must start with http or https');
  }
  return parsed.toString();
}

function detectPlatform(url: string): 'tiktok' | 'instagram' | 'youtube' | 'vimeo' | 'other' {
  const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  if (host.includes('tiktok.com')) return 'tiktok';
  if (host.includes('instagram.com')) return 'instagram';
  if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
  if (host.includes('vimeo.com')) return 'vimeo';
  return 'other';
}

function rewardFor({
  activations,
  installs,
  qualityMultiplier,
  originalityMultiplier,
  views,
}: {
  activations: number;
  installs: number;
  qualityMultiplier: number;
  originalityMultiplier: number;
  views: number;
}) {
  const safeViews = nonNegativeInteger(views, MAX_VIEW_COUNT);
  const safeInstalls = nonNegativeInteger(installs, MAX_INSTALL_COUNT);
  const safeActivations = nonNegativeInteger(activations, MAX_ACTIVATION_COUNT);
  const quality = safeMultiplier(qualityMultiplier);
  const originality = safeMultiplier(originalityMultiplier);
  const qualifiedViews = Math.floor(safeViews * quality * originality);
  const tier = [...PAYOUT_TIERS].reverse().find((t) => qualifiedViews >= t.views);
  const viewReward = tier?.cents ?? 0;
  const installReward = safeInstalls * 10;
  const activationReward = safeActivations * 100;
  return {
    qualifiedViews,
    rewardCents: viewReward + installReward + activationReward,
  };
}

function nonNegativeInteger(value: number | undefined, max: number) {
  if (value === undefined || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(max, Math.floor(value)));
}

function safeMultiplier(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return 1;
  return Math.max(0, Math.min(MAX_MULTIPLIER, value));
}

function campaignFor(slug: string) {
  return CAMPAIGNS.find((campaign) => campaign.slug === slug) ?? CAMPAIGNS[0];
}

function requireCampaign(slug: string) {
  const campaign = CAMPAIGNS.find((item) => item.slug === slug);
  if (!campaign) throw new Error('Campaign not found');
  return campaign;
}

async function fetchJson(url: string) {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Metadata import failed (${res.status})`);
  return (await res.json()) as {
    title?: string;
    author_name?: string;
    provider_name?: string;
    thumbnail_url?: string;
    url?: string;
  };
}

async function importOEmbed(url: string, platform: ReturnType<typeof detectPlatform>) {
  if (platform === 'tiktok') {
    return fetchJson(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
  }
  if (platform === 'youtube') {
    return fetchJson(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`);
  }
  if (platform === 'vimeo') {
    return fetchJson(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`);
  }
  if (platform === 'instagram') {
    const token = process.env.META_OEMBED_ACCESS_TOKEN;
    if (!token) {
      throw new Error('Instagram import needs META_OEMBED_ACCESS_TOKEN');
    }
    return fetchJson(
      `https://graph.facebook.com/v18.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${encodeURIComponent(token)}`
    );
  }
  throw new Error('Unsupported platform for automatic import');
}

export const campaigns = query({
  args: {},
  handler: async () =>
    CAMPAIGNS.map((campaign) => ({
      ...campaign,
      payoutTiers: PAYOUT_TIERS,
    })),
});

export const upsertCreator = mutation({
  args: {
    legalName: v.string(),
    phone: v.string(),
    region: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const phone = normalizePhone(args.phone);
    const existing = await ctx.db
      .query('bountyCreators')
      .withIndex('by_phone', (q) => q.eq('phone', phone))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        legalName: args.legalName.trim(),
        region: args.region,
        payoutStatus: 'ready',
        updatedAt: now,
      });
      return existing._id;
    }
    return ctx.db.insert('bountyCreators', {
      legalName: args.legalName.trim(),
      phone,
      region: args.region,
      payoutStatus: 'ready',
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const mySubmissions = query({
  args: {
    creatorPhone: v.string(),
  },
  handler: async (ctx, args) => {
    const phone = normalizePhone(args.creatorPhone);
    const submissions = await ctx.db
      .query('bountySubmissions')
      .withIndex('by_creator_created', (q) => q.eq('creatorPhone', phone))
      .order('desc')
      .take(20);
    return submissions.map((submission) => ({
      ...submission,
      campaign: campaignFor(submission.campaignSlug),
    }));
  },
});

export const submitLink = mutation({
  args: {
    campaignSlug: v.string(),
    creatorName: v.string(),
    creatorPhone: v.string(),
    url: v.string(),
    manualViewCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const canonicalUrl = normalizeUrl(args.url);
    const creatorPhone = normalizePhone(args.creatorPhone);
    const platform = detectPlatform(canonicalUrl);
    const viewCount = nonNegativeInteger(args.manualViewCount, MAX_VIEW_COUNT);
    const { qualifiedViews, rewardCents } = rewardFor({
      activations: 0,
      installs: 0,
      qualityMultiplier: 1,
      originalityMultiplier: 1,
      views: viewCount,
    });
    const duplicate = await ctx.db
      .query('bountySubmissions')
      .withIndex('by_creator_url', (q) => q.eq('creatorPhone', creatorPhone).eq('canonicalUrl', canonicalUrl))
      .first();
    if (duplicate) return duplicate._id;

    return ctx.db.insert('bountySubmissions', {
      campaignSlug: requireCampaign(args.campaignSlug).slug,
      canonicalUrl,
      creatorName: args.creatorName.trim() || 'Creator',
      creatorPhone,
      installCount: 0,
      activationCount: 0,
      metadataStatus: 'queued',
      originalityMultiplier: 1,
      platform,
      qualityMultiplier: 1,
      qualifiedViewCount: qualifiedViews,
      rewardCents,
      status: 'checking',
      url: args.url.trim(),
      viewCount,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const setSubmissionSignals = internalMutation({
  args: {
    id: v.id('bountySubmissions'),
    viewCount: v.optional(v.number()),
    installCount: v.optional(v.number()),
    activationCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.id);
    if (!submission) throw new Error('Submission not found');
    const viewCount = nonNegativeInteger(args.viewCount ?? submission.viewCount, MAX_VIEW_COUNT);
    const installCount = nonNegativeInteger(args.installCount ?? submission.installCount, MAX_INSTALL_COUNT);
    const activationCount = nonNegativeInteger(args.activationCount ?? submission.activationCount, MAX_ACTIVATION_COUNT);
    const { qualifiedViews, rewardCents } = rewardFor({
      activations: activationCount,
      installs: installCount,
      qualityMultiplier: submission.qualityMultiplier,
      originalityMultiplier: submission.originalityMultiplier,
      views: viewCount,
    });
    await ctx.db.patch(args.id, {
      viewCount,
      installCount,
      activationCount,
      qualifiedViewCount: qualifiedViews,
      rewardCents,
      updatedAt: Date.now(),
    });
  },
});

export const refreshSubmissionMetadata = action({
  args: {
    submissionId: v.id('bountySubmissions'),
  },
  handler: async (ctx, args): Promise<{ ok: boolean; error?: string }> => {
    try {
      const result = await ctx.runMutation((internal as any).bounty.markImporting, {
        id: args.submissionId,
      });
      const metadata = await importOEmbed(result.canonicalUrl, result.platform);
      await ctx.runMutation((internal as any).bounty.patchImportedMetadata, {
        id: args.submissionId,
        authorName: metadata.author_name,
        providerName: metadata.provider_name,
        thumbnailUrl: metadata.thumbnail_url,
        title: metadata.title,
      });
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Metadata import failed';
      await ctx.runMutation((internal as any).bounty.patchImportFailed, {
        id: args.submissionId,
        error: message,
      });
      return { ok: false, error: message };
    }
  },
});

export const markImporting = internalMutation({
  args: {
    id: v.id('bountySubmissions'),
    manualViewCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.id);
    if (!submission) throw new Error('Submission not found');
    let viewCount = submission.viewCount;
    if (args.manualViewCount !== undefined) {
      viewCount = nonNegativeInteger(args.manualViewCount, MAX_VIEW_COUNT);
    }
    const { qualifiedViews, rewardCents } = rewardFor({
      activations: submission.activationCount,
      installs: submission.installCount,
      qualityMultiplier: submission.qualityMultiplier,
      originalityMultiplier: submission.originalityMultiplier,
      views: viewCount,
    });
    await ctx.db.patch(args.id, {
      metadataStatus: 'queued',
      metadataError: undefined,
      viewCount,
      qualifiedViewCount: qualifiedViews,
      rewardCents,
      updatedAt: Date.now(),
    });
    return {
      canonicalUrl: submission.canonicalUrl ?? normalizeUrl(submission.url),
      platform: submission.platform,
    };
  },
});

export const patchImportedMetadata = internalMutation({
  args: {
    id: v.id('bountySubmissions'),
    authorName: v.optional(v.string()),
    providerName: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.id);
    if (!submission) return;
    await ctx.db.patch(args.id, {
      authorName: args.authorName,
      providerName: args.providerName,
      thumbnailUrl: args.thumbnailUrl,
      title: args.title,
      metadataStatus: 'imported',
      metadataError: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const patchImportFailed = internalMutation({
  args: {
    id: v.id('bountySubmissions'),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.id);
    if (!submission) return;
    await ctx.db.patch(args.id, {
      metadataStatus: 'failed',
      metadataError: args.error,
      updatedAt: Date.now(),
    });
  },
});

export const adminSetStatus = internalMutation({
  args: {
    id: v.id('bountySubmissions'),
    status: bountySubmissionStatus,
    qualityMultiplier: v.optional(v.number()),
    originalityMultiplier: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.id);
    if (!submission) throw new Error('Submission not found');
    const qualityMultiplier = safeMultiplier(args.qualityMultiplier ?? submission.qualityMultiplier);
    const originalityMultiplier = safeMultiplier(args.originalityMultiplier ?? submission.originalityMultiplier);
    const now = Date.now();
    const { qualifiedViews, rewardCents } = rewardFor({
      activations: submission.activationCount,
      installs: submission.installCount,
      qualityMultiplier,
      originalityMultiplier,
      views: submission.viewCount,
    });
    await ctx.db.patch(args.id, {
      status: args.status,
      qualityMultiplier,
      originalityMultiplier,
      qualifiedViewCount: qualifiedViews,
      rewardCents,
      paidAt: args.status === 'paid' ? now : undefined,
      reviewedAt: now,
      updatedAt: now,
    });
  },
});
