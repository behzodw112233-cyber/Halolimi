'use client';

import { api } from '@halolmia/backend/convex/_generated/api';
import { Button, Card, Chip } from '@heroui/react';
import { useMutation, useQuery } from 'convex/react';
import { Trash2 } from 'lucide-react';
import { ChartCard } from '@/components/chart-card';
import { AreaMini, DonutMini } from '@/components/charts/mini';
import { PageHeader } from '@/components/page-header';
import { CHART_PALETTE, METHOD_COLOR } from '@/lib/data';

const fmtSum = (n: number) => `${n.toLocaleString('en-US').replace(/,/g, ' ')} som`;
const fmtDateTime = (ts?: number) =>
  ts ? new Date(ts).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : '-';

const PURPOSE_META: Record<string, string> = {
  topup: 'Hisob toldirish',
  promote: 'Reklama',
  savings: "Jamg'arma",
};

const STATUS_META: Record<
  string,
  { label: string; color: 'success' | 'warning' | 'danger' | 'default' }
> = {
  success: { label: 'Tolangan', color: 'success' },
  pending: { label: 'Kutilmoqda', color: 'warning' },
  failed: { label: 'Xato', color: 'danger' },
  cancelled: { label: 'Bekor qilingan', color: 'default' },
};

export default function TolovlarPage() {
  const invoices = useQuery(api.jamgarma.listInvoices) ?? [];
  const payments = useQuery(api.payments.list) ?? [];
  const overview = useQuery(api.stats.overview);
  const removePayment = useMutation(api.payments.remove);

  const pendingInvoices = invoices.filter((i) => i.status === 'pending').length;
  const paidInvoices = invoices.filter((i) => i.status === 'success').length;

  const daily = (overview?.daily.revenue ?? []).map((d) => ({ x: d.x, v: Math.round(d.v) }));
  const methods =
    overview?.paymentMethods.map((m, i) => ({
      name: m.method,
      value: m.count,
      color: METHOD_COLOR[m.method] ?? CHART_PALETTE[i % CHART_PALETTE.length],
    })) ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title="Tolovlar" subtitle="Stripe invoicelar, balans toldirish va reklama tolovlari" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[
          { label: 'Bugungi tushum', value: fmtSum(overview?.totals.revenueToday ?? 0) },
          { label: 'Jami tushum', value: fmtSum(overview?.totals.revenue ?? 0) },
          { label: 'Tolangan invoice', value: String(paidInvoices) },
          { label: 'Kutilayotgan invoice', value: String(pendingInvoices) },
        ].map((s) => (
          <Card key={s.label} className="rounded-2xl border border-neutral-200 bg-white shadow-none">
            <Card.Content className="p-5">
              <p className="text-sm text-neutral-500">{s.label}</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900">{s.value}</p>
            </Card.Content>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Kunlik tushum (ming som)" subtitle="Songgi 7 kun">
          <AreaMini data={daily} color="#16A34A" />
        </ChartCard>
        <ChartCard title="Tolov usullari ulushi">
          <DonutMini data={methods} />
        </ChartCard>
      </div>

      <Card className="rounded-2xl border border-neutral-200 bg-white shadow-none">
        <Card.Header className="flex items-center justify-between p-5 pb-3">
          <div>
            <Card.Title className="text-base font-semibold text-neutral-900">
              Payment invoicelar
            </Card.Title>
            <Card.Description className="mt-0.5 text-sm text-neutral-500">
              Checkout yaratilganidan webhook orqali yakunlangungacha bolgan real holat.
            </Card.Description>
          </div>
          <Chip variant="soft" color={pendingInvoices ? 'warning' : 'success'} size="sm">
            {pendingInvoices} kutilmoqda
          </Chip>
        </Card.Header>
        <Card.Content className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-y border-neutral-200 text-xs uppercase text-neutral-400">
                  <th className="px-5 py-3 font-medium">Order</th>
                  <th className="px-5 py-3 font-medium">Foydalanuvchi</th>
                  <th className="px-5 py-3 font-medium">Maqsad</th>
                  <th className="px-5 py-3 font-medium">Usul</th>
                  <th className="px-5 py-3 font-medium">Summa</th>
                  <th className="px-5 py-3 font-medium">Holat</th>
                  <th className="px-5 py-3 font-medium">Yaratildi</th>
                  <th className="px-5 py-3 font-medium">Tolandi</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => {
                  const status = STATUS_META[invoice.status] ?? STATUS_META.pending;
                  const purpose = invoice.purpose ?? 'topup';
                  const method = invoice.method ?? 'Stripe';
                  return (
                    <tr key={invoice._id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-neutral-900">{invoice.orderId.slice(0, 10)}</p>
                        <p className="text-xs text-neutral-400">{invoice.orderId}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-neutral-700">{invoice.userName}</p>
                        <p className="text-xs text-neutral-400">{invoice.userPhone || '-'}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-neutral-700">
                          {PURPOSE_META[purpose] ?? purpose}
                          {invoice.tier ? `: ${invoice.tier.toUpperCase()}` : ''}
                        </p>
                        <p className="max-w-[220px] truncate text-xs text-neutral-400">
                          {invoice.listingTitle ?? 'Balans'}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className="rounded-md px-2 py-0.5 text-xs font-semibold text-white"
                          style={{ backgroundColor: METHOD_COLOR[method] ?? '#16A34A' }}
                        >
                          {method}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-neutral-900">
                        {fmtSum(invoice.amount)}
                        {invoice.stripeAmount && invoice.stripeCurrency ? (
                          <p className="mt-0.5 text-xs font-normal text-neutral-400">
                            Stripe: {invoice.stripeAmount} {invoice.stripeCurrency.toUpperCase()} minor units
                          </p>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5">
                        <Chip variant="soft" color={status.color} size="sm">
                          {status.label}
                        </Chip>
                      </td>
                      <td className="px-5 py-3.5 text-neutral-500">{fmtDateTime(invoice.createdAt)}</td>
                      <td className="px-5 py-3.5 text-neutral-500">{fmtDateTime(invoice.paidAt)}</td>
                      <td className="px-5 py-3.5 text-right"></td>
                    </tr>
                  );
                })}
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-8 text-center text-sm text-neutral-400">
                      Hali invoice yoq
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card.Content>
      </Card>

      <Card className="rounded-2xl border border-neutral-200 bg-white shadow-none">
        <Card.Header className="p-5 pb-3">
          <Card.Title className="text-base font-semibold text-neutral-900">
            Yakunlangan ledger
          </Card.Title>
          <Card.Description className="mt-0.5 text-sm text-neutral-500">
            Webhook tasdiqlangandan keyin avtomatik yoziladigan buxgalteriya qatori.
          </Card.Description>
        </Card.Header>
        <Card.Content className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-y border-neutral-200 text-xs uppercase text-neutral-400">
                  <th className="px-5 py-3 font-medium">ID</th>
                  <th className="px-5 py-3 font-medium">Foydalanuvchi</th>
                  <th className="px-5 py-3 font-medium">Xizmat</th>
                  <th className="px-5 py-3 font-medium">Usul</th>
                  <th className="px-5 py-3 font-medium">Summa</th>
                  <th className="px-5 py-3 font-medium">Holat</th>
                  <th className="px-5 py-3 font-medium">Sana</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p._id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                    <td className="px-5 py-3.5 font-medium text-neutral-900">P-{p._id.slice(-5)}</td>
                    <td className="px-5 py-3.5 text-neutral-600">{p.user}</td>
                    <td className="px-5 py-3.5 text-neutral-600">{p.type}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className="rounded-md px-2 py-0.5 text-xs font-semibold text-white"
                        style={{ backgroundColor: METHOD_COLOR[p.method] ?? '#16A34A' }}
                      >
                        {p.method}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-neutral-900">{p.amount}</td>
                    <td className="px-5 py-3.5">
                      <Chip variant="soft" color={p.status === 'success' ? 'success' : 'warning'} size="sm">
                        {p.status === 'success' ? 'Muvaffaqiyatli' : 'Kutilmoqda'}
                      </Chip>
                    </td>
                    <td className="px-5 py-3.5 text-neutral-500">{p.date}</td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        variant="tertiary"
                        size="sm"
                        onPress={() => {
                          if (confirm('Tolovni ochirasizmi?')) removePayment({ id: p._id });
                        }}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </td>
                  </tr>
                ))}
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-sm text-neutral-400">
                      Hali ledger yozuvi yoq
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
