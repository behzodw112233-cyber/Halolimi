import { httpRouter } from 'convex/server';
import { internal } from './_generated/api';
import { httpAction } from './_generated/server';

const http = httpRouter();

declare const process: { env: Record<string, string | undefined> };

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hmacSha256Hex(secret: string, input: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(input));
  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyStripeSignature(payload: string, header: string | null) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const parts = header.split(',');
  const timestamp = parts.find((part) => part.startsWith('t='))?.slice(2);
  const signatures = parts
    .filter((part) => part.startsWith('v1='))
    .map((part) => part.slice(3));
  if (!timestamp || signatures.length === 0) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;
  const expected = await hmacSha256Hex(secret, `${timestamp}.${payload}`);
  return signatures.some((signature) => safeEqual(expected, signature));
}

http.route({
  path: '/stripe/webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const payload = await request.text();
    const valid = await verifyStripeSignature(payload, request.headers.get('stripe-signature'));
    if (!valid) return Response.json({ ok: false, error: 'bad signature' }, { status: 403 });

    let event: {
      type?: string;
      data?: { object?: {
        id?: string;
        payment_intent?: string;
        amount_total?: number;
        amount_received?: number;
        payment_status?: string;
        status?: string;
      } };
    };
    try {
      event = JSON.parse(payload) as typeof event;
    } catch {
      return Response.json({ ok: false, error: 'invalid json' }, { status: 400 });
    }

    if (event.type !== 'checkout.session.completed' && event.type !== 'payment_intent.succeeded') {
      return Response.json({ ok: true, ignored: true }, { status: 200 });
    }

    const object = event.data?.object;
    if (!object?.id) {
      return Response.json({ ok: true, pending: true }, { status: 200 });
    }
    if (event.type === 'checkout.session.completed' && object.payment_status !== 'paid') {
      return Response.json({ ok: true, pending: true }, { status: 200 });
    }
    if (event.type === 'payment_intent.succeeded' && object.status !== 'succeeded') {
      return Response.json({ ok: true, pending: true }, { status: 200 });
    }
    try {
      await ctx.runMutation(internal.jamgarma.settleStripe, {
        sessionId: object.id,
        paymentIntentId: object.payment_intent ?? object.id,
        amountTotalMinor: object.amount_total ?? object.amount_received,
      });
      return Response.json({ ok: true }, { status: 200 });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Stripe webhook failed';
      return Response.json({ ok: false, error: message }, { status: 500 });
    }
  }),
});

export default http;
