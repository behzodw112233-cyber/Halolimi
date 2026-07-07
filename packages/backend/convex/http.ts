import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { internal } from './_generated/api';

const http = httpRouter();

/**
 * inPAY payment webhook. inPAY POSTs here when a transaction changes state.
 * The body is unsigned, so we only read the order_id and re-verify the real
 * status server-side (verifyAndSettle → /transactions). Always answer 200 so
 * inPAY doesn't retry; settlement is idempotent.
 */
http.route({
  path: '/inpay/callback',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    let body: { order_id?: string } | null = null;
    try {
      body = await request.json();
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }
    if (body?.order_id) {
      await ctx.runAction(internal.inpay.verifyAndSettle, { orderId: body.order_id });
    }
    return new Response('OK', { status: 200 });
  }),
});

export default http;
