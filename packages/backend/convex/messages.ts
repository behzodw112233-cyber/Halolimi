import { v } from 'convex/values';
import { mutation, query, type MutationCtx } from './_generated/server';
import { internal } from './_generated/api';
import { createForUser } from './notifications';
import type { Id } from './_generated/dataModel';

const TYPING_MS = 5_000; // typing indicator lifetime
const ONLINE_MS = 60_000; // "online" if seen within a minute

/** Deterministic key so opening the same buyer↔seller↔listing chat reuses one thread. */
function threadKey(a: Id<'users'>, b: Id<'users'> | undefined, listingId: Id<'listings'>) {
  const pair = b ? [a, b].sort().join('-') : a;
  return `${listingId}:${pair}`;
}

/** The current member row + the counterpart's member row for a thread. */
async function memberRows(ctx: MutationCtx, threadId: Id<'threads'>, userId: Id<'users'>) {
  const all = await ctx.db
    .query('threadMembers')
    .withIndex('by_thread', (q) => q.eq('threadId', threadId))
    .collect();
  const mine = all.find((m) => m.userId === userId) ?? null;
  const other = all.find((m) => m.userId !== userId) ?? null;
  return { mine, other };
}

/**
 * Open (or reuse) a chat with a listing's seller. Returns the thread id to
 * navigate to. Creates member rows for both sides so each sees the other's name.
 */
export const openThread = mutation({
  args: { meId: v.id('users'), listingId: v.id('listings') },
  handler: async (ctx, { meId, listingId }) => {
    const listing = await ctx.db.get(listingId);
    if (!listing) throw new Error('Eʼlon topilmadi');
    const sellerId = listing.ownerId && listing.ownerId !== meId ? listing.ownerId : undefined;
    const key = threadKey(meId, sellerId, listingId);

    const existing = await ctx.db
      .query('threads')
      .withIndex('by_key', (q) => q.eq('key', key))
      .first();
    if (existing) return existing._id;

    const threadId = await ctx.db.insert('threads', {
      key,
      listingId,
      title: listing.title,
      lastText: '',
      lastAt: Date.now(),
    });

    const me = await ctx.db.get(meId);
    const seller = sellerId ? await ctx.db.get(sellerId) : null;
    // My view: counterpart is the seller.
    await ctx.db.insert('threadMembers', {
      threadId,
      userId: meId,
      otherId: sellerId,
      otherName: seller?.name ?? listing.sellerName,
      unread: 0,
      lastReadAt: Date.now(),
    });
    // Seller's view: counterpart is me (only if the seller is a real user).
    if (sellerId) {
      await ctx.db.insert('threadMembers', {
        threadId,
        userId: sellerId,
        otherId: meId,
        otherName: me?.name ?? 'Xaridor',
        unread: 0,
        lastReadAt: 0,
      });
    }
    return threadId;
  },
});

/** Thread list for a user: last message, unread count, counterpart + online state. */
export const myThreads = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const members = await ctx.db
      .query('threadMembers')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    const now = Date.now();
    const rows = await Promise.all(
      members.map(async (m) => {
        const thread = await ctx.db.get(m.threadId);
        const other = m.otherId ? await ctx.db.get(m.otherId) : null;
        const online = !!other?.lastSeen && now - other.lastSeen < ONLINE_MS;
        return {
          threadId: m.threadId,
          otherName: m.otherName,
          unread: m.unread,
          lastText: thread?.lastText ?? '',
          lastAt: thread?.lastAt ?? 0,
          online,
        };
      })
    );
    return rows.sort((a, b) => b.lastAt - a.lastAt);
  },
});

/** Messages for a thread (oldest first) with resolved image URLs + reply previews. */
export const list = query({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    const rows = await ctx.db
      .query('messages')
      .withIndex('by_thread', (q) => q.eq('threadId', threadId))
      .collect();
    const sorted = rows.sort((a, b) => a.createdAt - b.createdAt);
    return Promise.all(
      sorted.map(async (m) => {
        const imageUrl = m.imageId ? await ctx.storage.getUrl(m.imageId) : null;
        const audioUrl = m.audioId ? await ctx.storage.getUrl(m.audioId) : null;
        let replyPreview: { name: string; text: string } | null = null;
        if (m.replyToId) {
          const r = await ctx.db.get(m.replyToId);
          if (r) replyPreview = { name: r.senderName, text: r.deletedAt ? 'xabar' : r.text };
        }
        return { ...m, imageUrl, audioUrl, replyPreview };
      })
    );
  },
});

/**
 * Header/receipt info for an open thread from `userId`'s perspective: the
 * counterpart's name, online + typing state, and how far they've read.
 * Returns null for legacy/string thread ids that have no thread doc.
 */
export const threadInfo = query({
  args: { threadId: v.string(), userId: v.optional(v.id('users')) },
  handler: async (ctx, { threadId, userId }) => {
    const tid = ctx.db.normalizeId('threads', threadId);
    if (!tid) return null;
    const thread = await ctx.db.get(tid);
    if (!thread) return null;
    const all = await ctx.db
      .query('threadMembers')
      .withIndex('by_thread', (q) => q.eq('threadId', tid))
      .collect();
    const other = all.find((m) => m.userId !== userId) ?? null;
    const otherUser = other?.userId ? await ctx.db.get(other.userId) : null;
    const now = Date.now();
    return {
      title: thread.title,
      otherId: other?.userId ?? null,
      otherName: other?.otherName ?? 'Sotuvchi',
      otherOnline: !!otherUser?.lastSeen && now - otherUser.lastSeen < ONLINE_MS,
      otherTyping: !!other?.typingUntil && other.typingUntil > now,
      otherLastReadAt: other?.lastReadAt ?? 0,
    };
  },
});

export const send = mutation({
  args: {
    threadId: v.string(),
    senderId: v.optional(v.id('users')),
    senderName: v.string(),
    text: v.string(),
    imageId: v.optional(v.id('_storage')),
    audioId: v.optional(v.id('_storage')),
    audioDuration: v.optional(v.number()),
    replyToId: v.optional(v.id('messages')),
  },
  handler: async (ctx, args) => {
    if (args.senderId) {
      const sender = await ctx.db.get(args.senderId);
      if (sender?.status === 'blocked') throw new Error('Hisobingiz bloklangan');
    }
    const messageId = await ctx.db.insert('messages', {
      threadId: args.threadId,
      senderId: args.senderId,
      senderName: args.senderName,
      text: args.text,
      imageId: args.imageId,
      audioId: args.audioId,
      audioDuration: args.audioDuration,
      replyToId: args.replyToId,
      createdAt: Date.now(),
    });

    // Keep the thread summary + unread counters fresh (real thread docs only).
    const tid = ctx.db.normalizeId('threads', args.threadId);
    if (tid) {
      const preview = args.text || (args.imageId ? '📷 Rasm' : args.audioId ? '🎤 Ovozli xabar' : '');
      await ctx.db.patch(tid, {
        lastText: preview,
        lastAt: Date.now(),
        lastSenderId: args.senderId,
      });
      const all = await ctx.db
        .query('threadMembers')
        .withIndex('by_thread', (q) => q.eq('threadId', tid))
        .collect();
      for (const m of all) {
        if (args.senderId && m.userId === args.senderId) {
          await ctx.db.patch(m._id, { lastReadAt: Date.now(), typingUntil: undefined });
        } else {
          await ctx.db.patch(m._id, { unread: m.unread + 1 });
          await createForUser(ctx, {
            userId: m.userId,
            icon: 'chatbubble-ellipses-outline',
            title: args.senderName || 'Yangi xabar',
            body: preview || 'Sizga xabar yubordi.',
            targetType: 'chat',
            targetId: args.threadId,
          });
          // Push the message to the recipient's device(s).
          await ctx.scheduler.runAfter(0, internal.push.send, {
            userId: m.userId,
            title: args.senderName || 'Yangi xabar',
            body: preview || 'Sizga xabar yubordi.',
            data: { type: 'chat', threadId: args.threadId },
          });
        }
      }
    }
    return messageId;
  },
});

/** Mark a thread read by a user (clears their unread badge + advances read cursor). */
export const markRead = mutation({
  args: { threadId: v.string(), userId: v.id('users') },
  handler: async (ctx, { threadId, userId }) => {
    const tid = ctx.db.normalizeId('threads', threadId);
    if (!tid) return;
    const { mine } = await memberRows(ctx, tid, userId);
    if (mine) await ctx.db.patch(mine._id, { unread: 0, lastReadAt: Date.now() });
  },
});

/** Signal that a user is typing (auto-expires ~5s later). */
export const setTyping = mutation({
  args: { threadId: v.string(), userId: v.id('users') },
  handler: async (ctx, { threadId, userId }) => {
    const tid = ctx.db.normalizeId('threads', threadId);
    if (!tid) return;
    const { mine } = await memberRows(ctx, tid, userId);
    if (mine) await ctx.db.patch(mine._id, { typingUntil: Date.now() + TYPING_MS });
  },
});

/** Toggle a user's emoji reaction on a message (one reaction per user). */
export const react = mutation({
  args: { messageId: v.id('messages'), userId: v.id('users'), emoji: v.string() },
  handler: async (ctx, { messageId, userId, emoji }) => {
    const msg = await ctx.db.get(messageId);
    if (!msg) return;
    const current = msg.reactions ?? [];
    const idx = current.findIndex((r) => r.userId === userId);
    let next;
    if (idx >= 0 && current[idx].emoji === emoji) {
      next = current.filter((_, i) => i !== idx); // same → remove
    } else if (idx >= 0) {
      next = current.map((r, i) => (i === idx ? { userId, emoji } : r)); // switch
    } else {
      next = [...current, { userId, emoji }];
    }
    await ctx.db.patch(messageId, { reactions: next });
  },
});

/** Edit own message text. */
export const edit = mutation({
  args: { messageId: v.id('messages'), userId: v.id('users'), text: v.string() },
  handler: async (ctx, { messageId, userId, text }) => {
    const msg = await ctx.db.get(messageId);
    if (!msg || msg.senderId !== userId) throw new Error('Ruxsat yoʻq');
    await ctx.db.patch(messageId, { text, editedAt: Date.now() });
  },
});

/** Soft-delete own message (shows as "xabar oʻchirildi"). */
export const deleteMessage = mutation({
  args: { messageId: v.id('messages'), userId: v.id('users') },
  handler: async (ctx, { messageId, userId }) => {
    const msg = await ctx.db.get(messageId);
    if (!msg || msg.senderId !== userId) throw new Error('Ruxsat yoʻq');
    await ctx.db.patch(messageId, { deletedAt: Date.now(), text: '', imageId: undefined, audioId: undefined });
  },
});
