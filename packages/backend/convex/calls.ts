import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { internal } from './_generated/api';
import { createForUser } from './notifications';

/** How long a call stays "ringing" before the caller should give up. */
const RING_TIMEOUT_MS = 45_000;

/** Caller creates a call doc with their SDP offer and rings the callee. */
export const start = mutation({
  args: {
    threadId: v.string(),
    callerId: v.id('users'),
    callerName: v.string(),
    calleeId: v.id('users'),
    calleeName: v.string(),
    offer: v.string(),
  },
  handler: async (ctx, args) => {
    const callId = await ctx.db.insert('calls', {
      threadId: args.threadId,
      callerId: args.callerId,
      calleeId: args.calleeId,
      callerName: args.callerName,
      calleeName: args.calleeName,
      offer: args.offer,
      status: 'ringing',
      createdAt: Date.now(),
    });
    await createForUser(ctx, {
      userId: args.calleeId,
      icon: 'call-outline',
      title: `${args.callerName} qoʼngʼiroq qilyapti`,
      body: 'Video qoʼngʼiroq',
      targetType: 'call',
      targetId: callId,
    });
    await ctx.scheduler.runAfter(0, internal.push.send, {
      userId: args.calleeId,
      title: `${args.callerName} qoʻngʻiroq qilyapti`,
      body: 'Video qoʻngʻiroq',
      data: { type: 'call', callId },
    });
    return callId;
  },
});

/** Callee accepts: attaches their SDP answer and flips the call to accepted. */
export const answer = mutation({
  args: { callId: v.id('calls'), answer: v.string() },
  handler: async (ctx, { callId, answer }) => {
    await ctx.db.patch(callId, { answer, status: 'accepted' });
  },
});

/** Callee rejects an incoming call. */
export const decline = mutation({
  args: { callId: v.id('calls') },
  handler: async (ctx, { callId }) => {
    await ctx.db.patch(callId, { status: 'declined', endedAt: Date.now() });
  },
});

/** Either side hangs up. A call still "ringing" when ended counts as missed. */
export const end = mutation({
  args: { callId: v.id('calls') },
  handler: async (ctx, { callId }) => {
    const call = await ctx.db.get(callId);
    if (!call || call.endedAt) return;
    await ctx.db.patch(callId, {
      status: call.status === 'ringing' ? 'missed' : 'ended',
      endedAt: Date.now(),
    });
  },
});

/** Trickle an ICE candidate to the other side of the call. */
export const addCandidate = mutation({
  args: { callId: v.id('calls'), senderId: v.id('users'), candidate: v.string() },
  handler: async (ctx, { callId, senderId, candidate }) => {
    await ctx.db.insert('callCandidates', { callId, senderId, candidate, createdAt: Date.now() });
  },
});

export const get = query({
  args: { callId: v.id('calls') },
  handler: async (ctx, { callId }) => ctx.db.get(callId),
});

/** Candidates sent by the other participant, oldest first. */
export const candidatesFrom = query({
  args: { callId: v.id('calls'), otherUserId: v.id('users') },
  handler: async (ctx, { callId, otherUserId }) => {
    const rows = await ctx.db
      .query('callCandidates')
      .withIndex('by_call_sender', (q) => q.eq('callId', callId).eq('senderId', otherUserId))
      .collect();
    return rows.sort((a, b) => a.createdAt - b.createdAt).map((r) => r.candidate);
  },
});

/** The most recent still-ringing call for a user, if any — drives the incoming-call UI. */
export const incoming = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const rows = await ctx.db
      .query('calls')
      .withIndex('by_callee_status_created', (q) => q.eq('calleeId', userId).eq('status', 'ringing'))
      .order('desc')
      .take(5);
    const now = Date.now();
    const ringing = rows
      .filter((r) => now - r.createdAt < RING_TIMEOUT_MS)
      .sort((a, b) => b.createdAt - a.createdAt);
    return ringing[0] ?? null;
  },
});
