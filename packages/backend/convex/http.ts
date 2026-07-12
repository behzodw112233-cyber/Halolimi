import { httpRouter } from 'convex/server';
import { internal } from './_generated/api';
import { httpAction } from './_generated/server';

const http = httpRouter();

declare const process: { env: Record<string, string | undefined> };

type InpayWebhookBody = {
  order_id?: string;
  amount?: number | string;
  status?: string;
  signature?: string;
};

type PaytechWebhookBody = {
  order_id?: string | number;
  id?: string | number;
  amount?: number | string;
  status?: string;
  payment_method?: string;
  transaction_id?: number | string;
  signature?: string;
};

const asText = (value: unknown) =>
  value === undefined || value === null ? '' : String(value);

async function sha256Hex(input: string) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function verifyInpaySignature(body: InpayWebhookBody) {
  const salt = process.env.INPAY_WEBHOOK_SALT;
  if (!salt) return true;
  const signature = asText(body.signature);
  if (!signature) return false;
  const expected = await sha256Hex(
    `${asText(body.order_id)}${asText(body.amount)}${asText(body.status)}${salt}`
  );
  return safeEqual(expected.toLowerCase(), signature.toLowerCase());
}

function normalizePaytechStatus(status?: string): 'success' | 'failed' | 'cancelled' | 'pending' | null {
  const value = status?.toLowerCase();
  if (value === 'success' || value === 'paid' || value === 'completed') return 'success';
  if (value === 'failed' || value === 'error') return 'failed';
  if (value === 'cancelled' || value === 'canceled') return 'cancelled';
  if (value === 'pending' || value === 'created') return 'pending';
  return null;
}

async function verifyPaytechSignature(body: PaytechWebhookBody) {
  const secret = process.env.PAYTECH_CALLBACK_SECRET;
  if (!secret) return false;
  const orderId = asText(body.order_id ?? body.id);
  const expected = await sha256Hex(
    `${orderId}${asText(body.status)}${asText(body.amount)}${secret}`
  );
  return safeEqual(expected.toLowerCase(), asText(body.signature).toLowerCase());
}

http.route({
  path: '/inpay/callback',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    let body: InpayWebhookBody | null = null;
    try {
      body = (await request.json()) as InpayWebhookBody | null;
    } catch {
      return Response.json({ ok: false, error: 'invalid json' }, { status: 400 });
    }

    if (!body?.order_id) {
      return Response.json({ ok: false, error: 'missing order_id' }, { status: 400 });
    }

    try {
      const valid = await verifyInpaySignature(body);
      if (!valid) {
        return Response.json({ ok: false, error: 'bad signature' }, { status: 403 });
      }

      await ctx.runAction(internal.inpay.verifyAndSettle, {
        orderId: body.order_id,
      });
      return Response.json({ ok: true }, { status: 200 });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'webhook failed';
      return Response.json({ ok: false, error: message }, { status: 500 });
    }
  }),
});

http.route({
  path: '/paytech/callback',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    let body: PaytechWebhookBody | null = null;
    try {
      body = (await request.json()) as PaytechWebhookBody | null;
    } catch {
      return Response.json({ ok: false, error: 'invalid json' }, { status: 400 });
    }

    const orderId = asText(body?.order_id ?? body?.id);
    if (!body || !orderId) {
      return Response.json({ ok: false, error: 'missing order_id' }, { status: 400 });
    }

    const status = normalizePaytechStatus(body.status);
    if (!status) {
      return Response.json({ ok: false, error: 'unknown status' }, { status: 400 });
    }

    try {
      const valid = await verifyPaytechSignature(body);
      if (!valid) {
        return Response.json({ ok: false, error: 'bad signature' }, { status: 403 });
      }

      await ctx.runMutation(internal.inpay.settlePaytech, {
        orderId,
        status,
        method: body.payment_method,
        transactionId:
          body.transaction_id === undefined || body.transaction_id === null
            ? undefined
            : Number(body.transaction_id),
      });
      return Response.json({ ok: true }, { status: 200 });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'webhook failed';
      return Response.json({ ok: false, error: message }, { status: 500 });
    }
  }),
});

export default http;
