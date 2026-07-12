# Halolmi PayTech bridge

FastAPI sidecar for PayTechUz-style payments. Convex remains the source of truth
for invoices, wallet balances, promotions, and ledger rows.

## Flow

1. Mobile calls `api.inpay.createInvoice` or `api.inpay.createPromoteInvoice`.
2. Convex calls this service at `POST /api/v1/orders`.
3. This service returns `{ id, amount, payment_method, payment_link }`.
4. Mobile opens `payment_link`.
5. Gateway webhooks hit this service at `/api/v1/webhooks/{payme|click|atmos}`.
6. This service forwards a signed settlement to Convex `/paytech/callback`.
7. Convex idempotently marks the invoice paid/failed/cancelled.

## Local setup

```bash
cd apps/paytech
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
npm run dev -w @halolmia/paytech
```

For local UI smoke tests without real gateway credentials:

```env
PAYTECH_ALLOW_FAKE_LINKS=True
PAYTECH_CALLBACK_SECRET=dev_secret
PAYTECH_SERVICE_TOKEN=dev_token
CONVEX_PAYTECH_CALLBACK_URL=http://localhost:3210/paytech/callback
PAYTECH_PUBLIC_BASE_URL=http://127.0.0.1:8000
```

When Convex runs in the cloud, keep Convex `PAYTECH_SERVICE_URL` pointed at a
public HTTPS URL that can reach this sidecar. `PAYTECH_PUBLIC_BASE_URL` controls
only the checkout link opened by the browser. For Expo Web, localhost avoids the
localtunnel warning page while still letting Convex create orders through the
public tunnel.

## Convex env

Set these on the Convex deployment:

```bash
npx convex env set PAYTECH_SERVICE_URL https://your-paytech-service.example.com
npx convex env set PAYTECH_SERVICE_TOKEN dev_token
npx convex env set PAYTECH_CALLBACK_SECRET dev_secret
```

`PAYTECH_CALLBACK_SECRET` must be identical in Convex and this FastAPI service.

If `PAYTECH_SERVICE_URL` is not configured, Convex falls back to the existing
inPAY integration.

## PayTechUz upstream

The bridge supports the example contract from
`PayTechUz/fastapi_paytechuz`:

- `POST /api/v1/orders`
- request: `{ product_name, amount, payment_method }`
- response: `{ id, amount, payment_method, payment_link }`

Set `PAYTECH_UPSTREAM_URL` to a deployed PayTechUz example service if you want
this bridge to proxy order creation to it.

## Real Uzbek gateways

For production, prefer Payme or Uzum Checkout first. Payme has the clearest
public sandbox flow (`test.paycom.uz`) and Merchant API transaction lifecycle.
Uzum Checkout has a modern hosted checkout with documented test cards, refunds,
and callbacks. Click is still worth adding for local reach after merchant access
is approved.
