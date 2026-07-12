import { ConvexHttpClient } from 'convex/browser';
import { api } from '../packages/backend/convex/_generated/api.js';

const convexUrl = process.env.CONVEX_URL ?? 'https://compassionate-labrador-165.convex.cloud';
const paytechUrl = process.env.PAYTECH_SERVICE_URL ?? 'http://127.0.0.1:8000';
const paytechToken = process.env.PAYTECH_SERVICE_TOKEN ?? 'dev_token';

const client = new ConvexHttpClient(convexUrl);

const users = await client.query(api.users.list);
const user = users[0];
if (!user) throw new Error('No dev users found to attach a payment invoice');

const beforeBalance = user.balance ?? 0;
const amount = 1234;

const invoice = await client.action(api.inpay.createInvoice, {
  userId: user._id,
  amount,
  method: 'payme',
});

const pending = await client.query(api.inpay.byOrder, { orderId: invoice.orderId });
if (pending?.status !== 'pending') {
  throw new Error(`Expected pending invoice, got ${JSON.stringify(pending)}`);
}

const settleRes = await fetch(`${paytechUrl}/api/v1/settlements`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${paytechToken}`,
  },
  body: JSON.stringify({
    order_id: invoice.orderId,
    status: 'success',
    amount,
    payment_method: 'payme',
  }),
});

const settleBody = await settleRes.json();
if (!settleRes.ok) {
  throw new Error(`Settlement failed: ${JSON.stringify(settleBody)}`);
}

await new Promise((resolve) => setTimeout(resolve, 1500));

const paid = await client.query(api.inpay.byOrder, { orderId: invoice.orderId });
const refreshedUsers = await client.query(api.users.list);
const refreshedUser = refreshedUsers.find((item) => item._id === user._id);
const afterBalance = refreshedUser?.balance ?? 0;

if (paid?.status !== 'success') {
  throw new Error(`Expected successful invoice, got ${JSON.stringify(paid)}`);
}
if (afterBalance < beforeBalance + amount) {
  throw new Error(`Expected balance >= ${beforeBalance + amount}, got ${afterBalance}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      userId: user._id,
      orderId: invoice.orderId,
      payUrl: invoice.payUrl,
      status: paid.status,
      beforeBalance,
      afterBalance,
      added: afterBalance - beforeBalance,
      settlement: settleBody,
    },
    null,
    2
  )
);
