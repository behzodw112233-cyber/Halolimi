import hashlib
import hmac
import html
import os
import time
from typing import Any, Literal

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

load_dotenv()

PaymentMethod = Literal["payme", "click", "atmos"]
OrderStatus = Literal["pending", "success", "failed", "cancelled"]

app = FastAPI(title="Halolmi PayTech bridge", version="0.1.0")
dev_orders: dict[str, dict[str, Any]] = {}


class OrderCreate(BaseModel):
  product_name: str
  amount: int = Field(gt=0)
  payment_method: PaymentMethod
  external_id: str | None = None
  callback_url: str | None = None


class OrderOut(BaseModel):
  id: str
  amount: int
  payment_method: PaymentMethod
  payment_link: str


class SettlementIn(BaseModel):
  order_id: str
  status: OrderStatus
  amount: int
  payment_method: PaymentMethod
  transaction_id: int | None = None


def env(name: str, default: str | None = None) -> str | None:
  value = os.getenv(name)
  return value if value not in ("", None) else default


def require_service_token(authorization: str | None) -> None:
  token = env("PAYTECH_SERVICE_TOKEN")
  if not token:
    return
  if authorization != f"Bearer {token}":
    raise HTTPException(status_code=401, detail="bad service token")


def signature(order_id: str, status: str, amount: int) -> str:
  secret = env("PAYTECH_CALLBACK_SECRET")
  if not secret:
    raise HTTPException(status_code=500, detail="PAYTECH_CALLBACK_SECRET is not configured")
  payload = f"{order_id}{status}{amount}{secret}".encode()
  return hashlib.sha256(payload).hexdigest()


def normalize_order_response(data: dict[str, Any], order: OrderCreate) -> OrderOut:
  order_id = data.get("order_id") or data.get("id") or data.get("external_id") or order.external_id
  payment_link = data.get("payment_link") or data.get("pay_url")
  if not order_id or not payment_link:
    raise HTTPException(status_code=502, detail="PayTech response missed id/payment_link")
  return OrderOut(
    id=str(order_id),
    amount=int(data.get("amount") or order.amount),
    payment_method=data.get("payment_method") or order.payment_method,
    payment_link=str(payment_link),
  )


async def create_with_upstream(order: OrderCreate) -> OrderOut | None:
  upstream = env("PAYTECH_UPSTREAM_URL")
  if not upstream:
    return None
  async with httpx.AsyncClient(timeout=20) as client:
    response = await client.post(
      f"{upstream.rstrip('/')}/api/v1/orders",
      json={
        "product_name": order.product_name,
        "amount": order.amount,
        "payment_method": order.payment_method,
      },
    )
  data = response.json()
  if response.status_code >= 400:
    raise HTTPException(status_code=502, detail=data)
  return normalize_order_response(data, order)


def public_base_url(request: Request) -> str:
  configured = env("PAYTECH_PUBLIC_BASE_URL")
  if configured:
    return configured.rstrip("/")
  proto = request.headers.get("x-forwarded-proto") or request.url.scheme
  host = request.headers.get("x-forwarded-host") or request.headers.get("host") or request.url.netloc
  return f"{proto}://{host}".rstrip("/")


def create_fake_order(order: OrderCreate, request: Request) -> OrderOut:
  if env("PAYTECH_ALLOW_FAKE_LINKS", "False").lower() != "true":
    raise HTTPException(
      status_code=501,
      detail="Configure PAYTECH_UPSTREAM_URL or wire the paytechuz SDK adapter before production use",
    )
  order_id = order.external_id or f"dev_{int(time.time() * 1000)}"
  dev_orders[order_id] = {
    "amount": order.amount,
    "payment_method": order.payment_method,
    "product_name": order.product_name,
    "created_at": int(time.time()),
  }
  return OrderOut(
    id=order_id,
    amount=order.amount,
    payment_method=order.payment_method,
    payment_link=f"{public_base_url(request)}/checkout/{order.payment_method}/{order_id}",
  )


@app.get("/health")
async def health() -> dict[str, bool]:
  return {"ok": True}


@app.post("/api/v1/orders", response_model=OrderOut)
async def create_order(
  request: Request,
  order: OrderCreate,
  authorization: str | None = Header(default=None),
) -> OrderOut:
  require_service_token(authorization)
  upstream_order = await create_with_upstream(order)
  if upstream_order:
    return upstream_order
  return create_fake_order(order, request)


async def forward_to_convex(payload: SettlementIn) -> dict[str, Any]:
  callback_url = env("CONVEX_PAYTECH_CALLBACK_URL")
  if not callback_url:
    raise HTTPException(status_code=500, detail="CONVEX_PAYTECH_CALLBACK_URL is not configured")
  body = payload.dict()
  body["signature"] = signature(payload.order_id, payload.status, payload.amount)
  async with httpx.AsyncClient(timeout=20) as client:
    response = await client.post(callback_url, json=body)
  data = response.json()
  if response.status_code >= 400:
    raise HTTPException(status_code=502, detail=data)
  return data


@app.post("/api/v1/settlements")
async def settle(
  payload: SettlementIn,
  authorization: str | None = Header(default=None),
) -> dict[str, Any]:
  require_service_token(authorization)
  return await forward_to_convex(payload)


def checkout_html(title: str, body: str) -> str:
  return f"""<!doctype html>
<html lang="uz">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{html.escape(title)}</title>
  <style>
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #f4f7fb;
      color: #101828;
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }}
    main {{
      width: min(420px, calc(100vw - 32px));
      border-radius: 24px;
      background: white;
      padding: 28px;
      box-shadow: 0 24px 80px rgba(15, 23, 42, 0.14);
    }}
    .brand {{ color: #0a6cff; font-weight: 800; letter-spacing: .02em; }}
    h1 {{ margin: 10px 0 8px; font-size: 28px; }}
    p {{ margin: 0 0 18px; color: #667085; line-height: 1.5; }}
    .row {{ display: flex; justify-content: space-between; padding: 12px 0; border-top: 1px solid #eef2f7; }}
    .row strong {{ color: #101828; }}
    button {{
      width: 100%;
      height: 52px;
      border: 0;
      border-radius: 16px;
      color: white;
      background: #0a6cff;
      font-size: 16px;
      font-weight: 800;
      cursor: pointer;
    }}
    .secondary {{ margin-top: 10px; background: #eef4ff; color: #0a6cff; }}
  </style>
</head>
<body>
  <main>{body}</main>
</body>
</html>"""


@app.get("/checkout/{payment_method}/{order_id}", response_class=HTMLResponse)
async def fake_checkout(payment_method: PaymentMethod, order_id: str) -> HTMLResponse:
  order = dev_orders.get(order_id)
  if not order:
    body = """
      <div class="brand">PayTech sandbox</div>
      <h1>Invoice topilmadi</h1>
      <p>Dev server qayta ishga tushgan bo'lishi mumkin. Appdan to'lovni qayta oching.</p>
    """
    return HTMLResponse(checkout_html("PayTech sandbox", body), status_code=404)

  amount = int(order["amount"])
  method = html.escape(payment_method.upper())
  product = html.escape(str(order.get("product_name") or "Halolmi to'lovi"))
  body = f"""
    <div class="brand">PayTech sandbox</div>
    <h1>{amount:,} so'm</h1>
    <p>{product}</p>
    <div class="row"><span>Usul</span><strong>{method}</strong></div>
    <div class="row"><span>Order</span><strong>{html.escape(order_id)}</strong></div>
    <form method="post" action="/checkout/{html.escape(payment_method)}/{html.escape(order_id)}/success">
      <button type="submit">To'lovni tasdiqlash</button>
    </form>
    <form method="post" action="/checkout/{html.escape(payment_method)}/{html.escape(order_id)}/cancelled">
      <button class="secondary" type="submit">Bekor qilish</button>
    </form>
  """
  return HTMLResponse(checkout_html("PayTech sandbox", body))


@app.post("/checkout/{payment_method}/{order_id}/{status}", response_class=HTMLResponse)
async def complete_fake_checkout(payment_method: PaymentMethod, order_id: str, status: OrderStatus) -> HTMLResponse:
  order = dev_orders.get(order_id)
  if not order:
    body = """
      <div class="brand">PayTech sandbox</div>
      <h1>Invoice topilmadi</h1>
      <p>Appdan to'lovni qayta oching.</p>
    """
    return HTMLResponse(checkout_html("PayTech sandbox", body), status_code=404)

  result = await forward_to_convex(
    SettlementIn(
      order_id=order_id,
      status=status,
      amount=int(order["amount"]),
      payment_method=payment_method,
      transaction_id=int(time.time() * 1000),
    )
  )
  title = "To'lov tasdiqlandi" if status == "success" else "To'lov yangilandi"
  body = f"""
    <div class="brand">PayTech sandbox</div>
    <h1>{html.escape(title)}</h1>
    <p>Convex callback javobi: {html.escape(str(result))}</p>
    <button onclick="window.close()">Yopish</button>
  """
  return HTMLResponse(checkout_html("PayTech sandbox", body))


@app.post("/api/v1/webhooks/{gateway}")
async def gateway_webhook(gateway: PaymentMethod, request: Request) -> dict[str, Any]:
  body = await request.json()
  order_id = str(body.get("order_id") or body.get("id") or body.get("account") or "")
  raw_status = str(body.get("status") or body.get("state") or "").lower()
  amount = int(float(body.get("amount") or body.get("sum") or 0))
  if not order_id:
    raise HTTPException(status_code=400, detail="missing order id")
  status: OrderStatus
  if raw_status in ("success", "paid", "completed", "2"):
    status = "success"
  elif raw_status in ("cancelled", "canceled", "-1"):
    status = "cancelled"
  elif raw_status in ("failed", "error", "-2"):
    status = "failed"
  else:
    status = "pending"
  return await forward_to_convex(
    SettlementIn(
      order_id=order_id,
      status=status,
      amount=amount,
      payment_method=gateway,
      transaction_id=body.get("transaction_id") or body.get("transaction"),
    )
  )
