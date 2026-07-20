'use client';

import { api } from '@halolmia/backend/convex/_generated/api';
import type { Doc } from '@halolmia/backend/convex/_generated/dataModel';
import { Button, Card, Chip } from '@heroui/react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { Banknote, CreditCard, Download, ExternalLink, Megaphone, RefreshCw, Search, Trash2, Wallet, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ChartCard } from '@/components/chart-card';
import { EvilFinanceChurnChart } from '@/components/charts/composed-chart';
import { AreaMini, DonutMini } from '@/components/charts/mini';
import { PageHeader } from '@/components/page-header';
import { CHART_PALETTE, METHOD_COLOR } from '@/lib/data';

const fmtSum = (n: number) => `${n.toLocaleString('en-US').replace(/,/g, ' ')} som`;
const fmtDateTime = (ts?: number) =>
  ts ? new Date(ts).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : '-';
const shortId = (id?: string | null) => (id ? `${id.slice(0, 8)}...${id.slice(-6)}` : '-');
const nowMs = () => Date.now();
const csvEscape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const UZ_WEEKDAY = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];
const dayKey = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

const PURPOSE_META: Record<string, string> = {
  topup: 'Hisob toldirish',
  promote: 'Reklama',
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
  const invoices = useQuery(api.stripe.listInvoices) ?? [];
  const payments = useQuery(api.payments.list) ?? [];
  const overview = useQuery(api.stats.overview);
  const refreshInvoice = useAction(api.stripe.refreshInvoice);
  const removePayment = useMutation(api.payments.remove);
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [purposeFilter, setPurposeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('30d');
  const [query, setQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Doc<'invoices'> & {
    userName?: string;
    userPhone?: string;
    listingTitle?: string | null;
  } | null>(null);

  const pendingInvoices = invoices.filter((i) => i.status === 'pending').length;
  const paidInvoices = invoices.filter((i) => i.status === 'success').length;
  const money = overview?.money;

  const daily = (overview?.daily.revenue ?? []).map((d) => ({ x: d.x, v: Math.round(d.v) }));
  const methods =
    overview?.paymentMethods.map((m, i) => ({
      name: m.method,
      value: m.count,
      color: METHOD_COLOR[m.method] ?? CHART_PALETTE[i % CHART_PALETTE.length],
    })) ?? [];
  const filteredInvoices = useMemo(() => {
    const now = nowMs();
    const start =
      dateFilter === 'today'
        ? new Date(new Date().setHours(0, 0, 0, 0)).getTime()
        : dateFilter === '7d'
          ? now - 7 * 24 * 60 * 60 * 1000
          : dateFilter === '30d'
            ? now - 30 * 24 * 60 * 60 * 1000
            : 0;
    const needle = query.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const method = invoice.method ?? 'Stripe';
      const purpose = invoice.purpose ?? 'topup';
      const search = [
        invoice.orderId,
        invoice.checkoutSessionId,
        invoice.paymentIntentId,
        invoice.userName,
        invoice.userPhone,
        invoice.listingTitle,
        purpose,
        method,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return (
        (statusFilter === 'all' || invoice.status === statusFilter) &&
        (methodFilter === 'all' || method === methodFilter) &&
        (purposeFilter === 'all' || purpose === purposeFilter) &&
        invoice.createdAt >= start &&
        (!needle || search.includes(needle))
      );
    });
  }, [dateFilter, invoices, methodFilter, purposeFilter, query, statusFilter]);
  const methodOptions = useMemo(
    () => ['all', ...Array.from(new Set(invoices.map((i) => i.method ?? 'Stripe')))],
    [invoices]
  );
  const filteredTotal = filteredInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const paidFilteredTotal = filteredInvoices
    .filter((invoice) => invoice.status === 'success')
    .reduce((sum, invoice) => sum + invoice.amount, 0);
  const pendingAging = useMemo(() => {
    const now = nowMs();
    const pending = invoices.filter((invoice) => invoice.status === 'pending');
    return {
      fresh: pending.filter((invoice) => now - invoice.createdAt < 15 * 60 * 1000).length,
      warm: pending.filter((invoice) => now - invoice.createdAt >= 15 * 60 * 1000 && now - invoice.createdAt < 60 * 60 * 1000).length,
      stale: pending.filter((invoice) => now - invoice.createdAt >= 60 * 60 * 1000).length,
    };
  }, [invoices]);
  const tierRevenue = useMemo(() => {
    const rows = invoices.filter((invoice) => invoice.status === 'success' && invoice.purpose === 'promote');
    return ['alo', 'zor', 'vip', 'lux'].map((tier) => ({
      tier: tier.toUpperCase(),
      amount: rows.filter((invoice) => invoice.tier === tier).reduce((sum, invoice) => sum + invoice.amount, 0),
      count: rows.filter((invoice) => invoice.tier === tier).length,
    }));
  }, [invoices]);
  const churnData = useMemo(() => {
    const buckets: { day: string; paid: number; pending: number; leakage: number; key: string }[] = [];
    const index: Record<string, number> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      index[key] = buckets.length;
      buckets.push({ key, day: UZ_WEEKDAY[d.getDay()], paid: 0, pending: 0, leakage: 0 });
    }
    for (const invoice of invoices) {
      const ts = invoice.paidAt ?? invoice.createdAt;
      const slot = index[dayKey(ts)];
      if (slot === undefined) continue;
      const amountK = Math.round(invoice.amount / 1000);
      if (invoice.status === 'success' && invoice.purpose === 'promote') buckets[slot].paid += amountK;
      if (invoice.status === 'pending') buckets[slot].pending += amountK;
      if (invoice.status === 'failed' || invoice.status === 'cancelled') buckets[slot].leakage += amountK;
    }
    return buckets.map(({ key: _key, ...row }) => row);
  }, [invoices]);
  const reconciliation = {
    stripeCashIn: money?.stripeCashIn ?? 0,
    walletTopups: money?.walletTopups ?? 0,
    revenue: money?.revenue ?? 0,
    pending: money?.pendingAmount ?? 0,
    liability: money?.walletLiability ?? 0,
  };
  const exportCsv = () => {
    const headers = ['orderId', 'status', 'purpose', 'method', 'amount_som', 'user', 'phone', 'listing', 'createdAt', 'paidAt', 'paymentIntentId'];
    const rows = filteredInvoices.map((invoice) => [
      invoice.orderId,
      invoice.status,
      invoice.purpose ?? 'topup',
      invoice.method ?? 'Stripe',
      invoice.amount,
      invoice.userName ?? '',
      invoice.userPhone ?? '',
      invoice.listingTitle ?? 'Balans',
      fmtDateTime(invoice.createdAt),
      fmtDateTime(invoice.paidAt),
      invoice.paymentIntentId ?? '',
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `halolmi-finance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title="Tolovlar" subtitle="Stripe test checkout invoicelar, balans toldirish va reklama tolovlari" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[
          { label: 'Bugungi revenue', value: fmtSum(money?.revenueToday ?? 0), icon: Banknote, tone: '#16A34A' },
          { label: 'Jami revenue', value: fmtSum(money?.revenue ?? 0), icon: Megaphone, tone: '#0A6CFF' },
          { label: 'Wallet top-up', value: fmtSum(money?.walletTopups ?? 0), icon: Wallet, tone: '#8B5CF6' },
          { label: 'Stripe cash-in', value: fmtSum(money?.stripeCashIn ?? 0), icon: CreditCard, tone: '#635BFF' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="rounded-2xl border border-neutral-200 bg-white shadow-none">
              <Card.Content className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-neutral-500">{s.label}</p>
                    <p className="mt-1 text-2xl font-bold text-neutral-900">{s.value}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${s.tone}16` }}>
                    <Icon size={20} style={{ color: s.tone }} />
                  </div>
                </div>
              </Card.Content>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        {[
          { label: 'Wallet majburiyat', value: fmtSum(money?.walletLiability ?? 0) },
          { label: 'Wallet revenue', value: fmtSum(money?.walletRevenue ?? 0) },
          { label: 'Stripe revenue', value: fmtSum(money?.stripeRevenue ?? 0) },
          { label: 'Pending summa', value: fmtSum(money?.pendingAmount ?? 0) },
          { label: 'Invoice holati', value: `${money?.paidInvoices ?? paidInvoices} paid / ${money?.pendingInvoices ?? pendingInvoices} pending` },
        ].map((s) => (
          <Card key={s.label} className="rounded-2xl border border-neutral-200 bg-white shadow-none">
            <Card.Content className="p-4">
              <p className="text-xs font-medium uppercase text-neutral-400">{s.label}</p>
              <p className="mt-1 text-lg font-bold text-neutral-900">{s.value}</p>
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
        <Card.Header className="flex items-start justify-between border-b border-neutral-200 bg-neutral-50/70 p-4">
          <div>
            <Card.Title className="text-sm font-bold uppercase tracking-wide text-neutral-900">
              Payment churn / leakage
            </Card.Title>
            <Card.Description className="mt-0.5 text-xs text-neutral-500">
              Paid promo revenue vs pending exposure and failed/cancelled leakage.
            </Card.Description>
          </div>
          <div className="flex flex-wrap justify-end gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-neutral-500"><span className="h-2 w-2 rounded-full bg-green-600" /> Paid</span>
            <span className="flex items-center gap-1.5 text-neutral-500"><span className="h-2 w-2 rounded-full bg-amber-500" /> Pending</span>
            <span className="flex items-center gap-1.5 text-neutral-500"><span className="h-2 w-2 rounded-full bg-red-500" /> Leakage</span>
          </div>
        </Card.Header>
        <Card.Content className="p-3">
          <EvilFinanceChurnChart data={churnData} />
        </Card.Content>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-2xl border border-neutral-200 bg-white shadow-none">
          <Card.Header className="border-b border-neutral-200 bg-neutral-50/70 p-4">
            <Card.Title className="text-sm font-bold uppercase tracking-wide text-neutral-900">
              Reconciliation
            </Card.Title>
            <Card.Description className="mt-0.5 text-xs text-neutral-500">
              Cash-in, revenue, liability va pending nazorat.
            </Card.Description>
          </Card.Header>
          <Card.Content className="grid grid-cols-2 gap-3 p-4 md:grid-cols-5">
            {[
              { label: 'Stripe cash-in', value: reconciliation.stripeCashIn, color: '#635BFF' },
              { label: 'Wallet top-up', value: reconciliation.walletTopups, color: '#8B5CF6' },
              { label: 'Promo revenue', value: reconciliation.revenue, color: '#0A6CFF' },
              { label: 'Pending', value: reconciliation.pending, color: '#F59E0B' },
              { label: 'Liability', value: reconciliation.liability, color: '#EF4444' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-neutral-200 bg-white p-3">
                <p className="text-[11px] font-semibold uppercase text-neutral-400">{item.label}</p>
                <p className="mt-1 font-mono text-sm font-bold text-neutral-900">{fmtSum(item.value)}</p>
                <div className="mt-2 h-1 rounded-full bg-neutral-100">
                  <div className="h-full rounded-full" style={{ width: '72%', backgroundColor: item.color }} />
                </div>
              </div>
            ))}
          </Card.Content>
        </Card>

        <Card className="rounded-2xl border border-neutral-200 bg-white shadow-none">
          <Card.Header className="border-b border-neutral-200 bg-neutral-50/70 p-4">
            <Card.Title className="text-sm font-bold uppercase tracking-wide text-neutral-900">
              Risk watch
            </Card.Title>
          </Card.Header>
          <Card.Content className="grid grid-cols-3 gap-3 p-4">
            {[
              { label: '0-15m', value: pendingAging.fresh, tone: 'text-green-600' },
              { label: '15-60m', value: pendingAging.warm, tone: 'text-amber-600' },
              { label: '1h+', value: pendingAging.stale, tone: 'text-red-600' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-center">
                <p className={`font-mono text-2xl font-bold ${item.tone}`}>{item.value}</p>
                <p className="mt-0.5 text-[11px] font-semibold uppercase text-neutral-400">{item.label} pending</p>
              </div>
            ))}
          </Card.Content>
        </Card>
      </div>

      <Card className="rounded-2xl border border-neutral-200 bg-white shadow-none">
        <Card.Header className="border-b border-neutral-200 bg-neutral-50/70 p-4">
          <Card.Title className="text-sm font-bold uppercase tracking-wide text-neutral-900">
            Revenue by tier
          </Card.Title>
        </Card.Header>
        <Card.Content className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
          {tierRevenue.map((row) => (
            <div key={row.tier} className="rounded-xl border border-neutral-200 bg-white p-3">
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">{row.tier}</span>
                <span className="text-xs text-neutral-400">{row.count} invoice</span>
              </div>
              <p className="mt-2 font-mono text-lg font-bold text-neutral-900">{fmtSum(row.amount)}</p>
            </div>
          ))}
        </Card.Content>
      </Card>

      <Card className="rounded-2xl border border-neutral-200 bg-white shadow-none">
        <Card.Content className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3">
            <Search size={16} className="text-neutral-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Order, PI, telefon, listing..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
            />
          </div>
          <FinanceSelect value={dateFilter} onChange={setDateFilter} options={[['all', 'All time'], ['today', 'Today'], ['7d', '7D'], ['30d', '30D']]} />
          <FinanceSelect value={statusFilter} onChange={setStatusFilter} options={[['all', 'All status'], ['success', 'Paid'], ['pending', 'Pending'], ['failed', 'Failed'], ['cancelled', 'Cancelled']]} />
          <FinanceSelect value={purposeFilter} onChange={setPurposeFilter} options={[['all', 'All purpose'], ['topup', 'Top-up'], ['promote', 'Promo']]} />
          <FinanceSelect value={methodFilter} onChange={setMethodFilter} options={methodOptions.map((m) => [m, m === 'all' ? 'All methods' : m])} />
          <Button variant="secondary" className="gap-2" onPress={exportCsv}>
            <Download size={16} /> Export CSV
          </Button>
        </Card.Content>
        <div className="border-t border-neutral-200 px-4 py-2 text-xs text-neutral-500">
          Showing <span className="font-semibold text-neutral-900">{filteredInvoices.length}</span> invoices · Total{' '}
          <span className="font-mono font-bold text-neutral-900">{fmtSum(filteredTotal)}</span> · Paid{' '}
          <span className="font-mono font-bold text-green-700">{fmtSum(paidFilteredTotal)}</span>
        </div>
      </Card>

      <Card className="rounded-2xl border border-neutral-200 bg-white shadow-none">
        <Card.Header className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50/70 p-4">
          <div>
            <Card.Title className="text-sm font-bold uppercase tracking-wide text-neutral-900">
              Payment invoicelar
            </Card.Title>
            <Card.Description className="mt-0.5 text-xs text-neutral-500">
              Stripe, wallet, webhook va invoice holatlari.
            </Card.Description>
          </div>
          <Chip variant="soft" color={pendingInvoices ? 'warning' : 'success'} size="sm">
            {pendingInvoices} kutilmoqda
          </Chip>
        </Card.Header>
        <Card.Content className="p-0">
          <div className="max-h-[620px] overflow-auto">
            <table className="w-full min-w-[1180px] table-fixed text-left text-[13px]">
              <thead className="sticky top-0 z-10 bg-white shadow-[inset_0_-1px_0_#e5e7eb]">
                <tr className="text-[11px] uppercase tracking-wide text-neutral-400">
                  <th className="w-[150px] px-4 py-2.5 font-semibold">Order</th>
                  <th className="w-[210px] px-4 py-2.5 font-semibold">Gateway refs</th>
                  <th className="w-[180px] px-4 py-2.5 font-semibold">Foydalanuvchi</th>
                  <th className="w-[190px] px-4 py-2.5 font-semibold">Maqsad</th>
                  <th className="w-[100px] px-4 py-2.5 font-semibold">Usul</th>
                  <th className="w-[130px] px-4 py-2.5 text-right font-semibold">Summa</th>
                  <th className="w-[120px] px-4 py-2.5 font-semibold">Holat</th>
                  <th className="w-[130px] px-4 py-2.5 font-semibold">Yaratildi</th>
                  <th className="w-[130px] px-4 py-2.5 font-semibold">Tolandi</th>
                  <th className="w-[120px] px-4 py-2.5 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => {
                  const status = STATUS_META[invoice.status] ?? STATUS_META.pending;
                  const purpose = invoice.purpose ?? 'topup';
                  const method = invoice.method ?? 'Stripe';
                  return (
                    <tr
                      key={invoice._id}
                      className="cursor-pointer border-b border-neutral-100 last:border-0 odd:bg-white even:bg-neutral-50/45 hover:bg-blue-50/50"
                      onClick={() => setSelectedInvoice(invoice)}
                    >
                      <td className="px-4 py-2.5 align-middle">
                        <p className="font-mono text-xs font-semibold text-neutral-900">{shortId(invoice.orderId)}</p>
                        <p className="mt-0.5 truncate font-mono text-[11px] text-neutral-400" title={invoice.orderId}>{invoice.orderId}</p>
                      </td>
                      <td className="px-4 py-2.5 align-middle">
                        <p className="truncate font-mono text-xs font-medium text-neutral-700" title={invoice.checkoutSessionId ?? invoice.orderId}>
                          {shortId(invoice.checkoutSessionId ?? invoice.orderId)}
                        </p>
                        <p className="truncate font-mono text-[11px] text-neutral-400" title={invoice.paymentIntentId ?? undefined}>
                          PI {shortId(invoice.paymentIntentId)}
                        </p>
                        <p className="truncate font-mono text-[11px] text-neutral-400" title={invoice.stripeEventId ?? undefined}>
                          EV {shortId(invoice.stripeEventId)}
                        </p>
                        {invoice.stripeAmount && invoice.stripeCurrency ? (
                          <p className="mt-0.5 font-mono text-[11px] text-neutral-500">
                            Stripe: {(invoice.stripeAmount / 100).toFixed(2)} {invoice.stripeCurrency.toUpperCase()}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5 align-middle">
                        <p className="truncate font-medium text-neutral-800">{invoice.userName}</p>
                        <p className="font-mono text-[11px] text-neutral-400">{invoice.userPhone || '-'}</p>
                      </td>
                      <td className="px-4 py-2.5 align-middle">
                        <p className="truncate font-medium text-neutral-800">
                          {PURPOSE_META[purpose] ?? purpose}
                          {invoice.tier ? `: ${invoice.tier.toUpperCase()}` : ''}
                        </p>
                        <p className="truncate text-[11px] text-neutral-400">
                          {invoice.listingTitle ?? 'Balans'}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 align-middle">
                        <span
                          className="inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold text-white"
                          style={{ backgroundColor: METHOD_COLOR[method] ?? '#16A34A' }}
                        >
                          {method}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right align-middle font-mono text-sm font-bold text-neutral-900">
                        {fmtSum(invoice.amount)}
                      </td>
                      <td className="px-4 py-2.5 align-middle">
                        <Chip variant="soft" color={status.color} size="sm">
                          {status.label}
                        </Chip>
                      </td>
                      <td className="px-4 py-2.5 align-middle text-xs text-neutral-500">{fmtDateTime(invoice.createdAt)}</td>
                      <td className="px-4 py-2.5 align-middle text-xs text-neutral-500">{fmtDateTime(invoice.paidAt)}</td>
                      <td className="px-4 py-2.5 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          {invoice.payUrl ? (
                            <a
                              href={invoice.payUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-8 items-center justify-center rounded-lg px-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                            >
                              <ExternalLink size={15} />
                            </a>
                          ) : null}
                          {invoice.status === 'pending' ? (
                            <Button
                              variant="primary"
                              size="sm"
                              className="gap-1"
                              onPress={() => refreshInvoice({ orderId: invoice.orderId })}
                            >
                              <RefreshCw size={14} /> Tekshirish
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-5 py-8 text-center text-sm text-neutral-400">
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
        <Card.Header className="border-b border-neutral-200 bg-neutral-50/70 p-4">
          <Card.Title className="text-sm font-bold uppercase tracking-wide text-neutral-900">
            Yakunlangan ledger
          </Card.Title>
          <Card.Description className="mt-0.5 text-xs text-neutral-500">
            Webhook tasdiqlangandan keyin avtomatik yoziladigan buxgalteriya qatori.
          </Card.Description>
        </Card.Header>
        <Card.Content className="p-0">
          <div className="max-h-[440px] overflow-auto">
            <table className="w-full min-w-[900px] table-fixed text-left text-[13px]">
              <thead className="sticky top-0 z-10 bg-white shadow-[inset_0_-1px_0_#e5e7eb]">
                <tr className="text-[11px] uppercase tracking-wide text-neutral-400">
                  <th className="w-[110px] px-4 py-2.5 font-semibold">ID</th>
                  <th className="w-[190px] px-4 py-2.5 font-semibold">Foydalanuvchi</th>
                  <th className="px-4 py-2.5 font-semibold">Xizmat</th>
                  <th className="w-[110px] px-4 py-2.5 font-semibold">Usul</th>
                  <th className="w-[150px] px-4 py-2.5 text-right font-semibold">Summa</th>
                  <th className="w-[130px] px-4 py-2.5 font-semibold">Holat</th>
                  <th className="w-[120px] px-4 py-2.5 font-semibold">Sana</th>
                  <th className="w-[70px] px-4 py-2.5 text-right font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p._id} className="border-b border-neutral-100 last:border-0 odd:bg-white even:bg-neutral-50/45 hover:bg-blue-50/50">
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold text-neutral-900">P-{p._id.slice(-5)}</td>
                    <td className="truncate px-4 py-2.5 text-neutral-700">{p.user}</td>
                    <td className="truncate px-4 py-2.5 text-neutral-700">{p.type}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className="inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold text-white"
                        style={{ backgroundColor: METHOD_COLOR[p.method] ?? '#16A34A' }}
                      >
                        {p.method}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-neutral-900">{p.amount}</td>
                    <td className="px-4 py-2.5">
                      <Chip variant="soft" color={p.status === 'success' ? 'success' : 'warning'} size="sm">
                        {p.status === 'success' ? 'Muvaffaqiyatli' : 'Kutilmoqda'}
                      </Chip>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-neutral-500">{p.date}</td>
                    <td className="px-4 py-2.5 text-right">
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

      {selectedInvoice ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={() => setSelectedInvoice(null)}>
          <aside
            className="h-full w-full max-w-xl overflow-y-auto border-l border-neutral-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-neutral-200 bg-white p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Invoice detail</p>
                <h2 className="mt-1 font-mono text-lg font-bold text-neutral-900">{shortId(selectedInvoice.orderId)}</h2>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-500 hover:bg-neutral-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-5 p-5">
              <div className="grid grid-cols-2 gap-3">
                <DetailMetric label="Amount" value={fmtSum(selectedInvoice.amount)} />
                <DetailMetric label="Status" value={STATUS_META[selectedInvoice.status]?.label ?? selectedInvoice.status} />
                <DetailMetric label="Method" value={selectedInvoice.method ?? 'Stripe'} />
                <DetailMetric label="Purpose" value={PURPOSE_META[selectedInvoice.purpose ?? 'topup'] ?? selectedInvoice.purpose ?? 'topup'} />
              </div>
              <DetailSection title="Customer">
                <DetailRow label="Name" value={selectedInvoice.userName ?? '-'} />
                <DetailRow label="Phone" value={selectedInvoice.userPhone ?? '-'} />
                <DetailRow label="Listing" value={selectedInvoice.listingTitle ?? 'Balans'} />
                <DetailRow label="Tier" value={selectedInvoice.tier?.toUpperCase() ?? '-'} />
              </DetailSection>
              <DetailSection title="Gateway">
                <DetailRow label="Order ID" value={selectedInvoice.orderId} mono />
                <DetailRow label="Checkout" value={selectedInvoice.checkoutSessionId ?? '-'} mono />
                <DetailRow label="PaymentIntent" value={selectedInvoice.paymentIntentId ?? '-'} mono />
                <DetailRow label="Stripe event" value={selectedInvoice.stripeEventId ?? '-'} mono />
                <DetailRow
                  label="Stripe amount"
                  value={
                    selectedInvoice.stripeAmount && selectedInvoice.stripeCurrency
                      ? `${(selectedInvoice.stripeAmount / 100).toFixed(2)} ${selectedInvoice.stripeCurrency.toUpperCase()}`
                      : '-'
                  }
                  mono
                />
              </DetailSection>
              <DetailSection title="Timeline">
                <DetailRow label="Created" value={fmtDateTime(selectedInvoice.createdAt)} />
                <DetailRow label="Paid" value={fmtDateTime(selectedInvoice.paidAt)} />
              </DetailSection>
              <div className="flex gap-2">
                {selectedInvoice.payUrl ? (
                  <a
                    href={selectedInvoice.payUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-neutral-200 px-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                  >
                    <ExternalLink size={16} /> Stripe link
                  </a>
                ) : null}
                {selectedInvoice.status === 'pending' ? (
                  <Button
                    variant="primary"
                    className="gap-2"
                    onPress={() => refreshInvoice({ orderId: selectedInvoice.orderId })}
                  >
                    <RefreshCw size={16} /> Tekshirish
                  </Button>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function FinanceSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[][];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 outline-none hover:bg-neutral-50 focus:border-accent"
    >
      {options.map(([optionValue, label]) => (
        <option key={optionValue} value={optionValue}>
          {label}
        </option>
      ))}
    </select>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
      <p className="text-[11px] font-semibold uppercase text-neutral-400">{label}</p>
      <p className="mt-1 truncate font-mono text-sm font-bold text-neutral-900">{value}</p>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-neutral-200">
      <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-2.5">
        <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">{title}</p>
      </div>
      <div className="divide-y divide-neutral-100">{children}</div>
    </section>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 px-4 py-2.5 text-sm">
      <span className="text-neutral-400">{label}</span>
      <span className={`min-w-0 break-all font-medium text-neutral-800 ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}
