import { httpRouter } from 'convex/server';
import { internal } from './_generated/api';
import { httpAction } from './_generated/server';

const http = httpRouter();

declare const process: { env: Record<string, string | undefined> };

type StripeEvent = {
  id?: string;
  type?: string;
  data?: {
    object?: {
      id?: string;
      payment_status?: string;
      status?: string;
    };
  };
};

function html(title: string, body: string) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font-family:Inter,Arial,sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f5f7;color:#0f172a}.card{max-width:420px;margin:24px;padding:28px;border-radius:20px;background:white;box-shadow:0 18px 60px rgba(15,23,42,.12)}h1{margin:0 0 10px;font-size:24px}p{margin:0;color:#64748b;line-height:1.5}</style></head><body><main class="card"><h1>${title}</h1><p>${body}</p></main></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256Hex(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return hex(signature);
}

async function verifyStripeSignature(payload: string, header: string | null) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  if (!header) return false;

  const parts = new Map(
    header.split(',').map((part) => {
      const [key, ...rest] = part.split('=');
      return [key, rest.join('=')];
    })
  );
  const timestamp = parts.get('t');
  const signature = parts.get('v1');
  if (!timestamp || !signature) return false;

  const expected = await hmacSha256Hex(secret, `${timestamp}.${payload}`);
  return safeEqual(expected, signature);
}

http.route({
  path: '/stripe/webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const payload = await request.text();
    try {
      const valid = await verifyStripeSignature(payload, request.headers.get('stripe-signature'));
      if (!valid) {
        return Response.json({ ok: false, error: 'bad signature' }, { status: 400 });
      }

      const event = JSON.parse(payload) as StripeEvent;
      await ctx.runMutation(internal.stripe.handleWebhookEvent, { event });

      return Response.json({ ok: true }, { status: 200 });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'webhook failed';
      return Response.json({ ok: false, error: message }, { status: 500 });
    }
  }),
});

http.route({
  path: '/stripe/success',
  method: 'GET',
  handler: httpAction(async () =>
    html('Tolov qabul qilindi', 'Stripe checkout yakunlandi. Ilovaga qayting, balans yoki reklama holati avtomatik yangilanadi.')
  ),
});

http.route({
  path: '/stripe/cancel',
  method: 'GET',
  handler: httpAction(async () =>
    html('Tolov bekor qilindi', 'Checkout yopildi. Ilovaga qaytib qayta urinishingiz mumkin.')
  ),
});

export default http;
