'use client';

import { api } from '@halolmia/backend/convex/_generated/api';
import { Button, Card, Chip } from '@heroui/react';
import { useMutation, useQuery } from 'convex/react';
import { Banknote, Check, CreditCard, Download, Megaphone, Wallet, X } from 'lucide-react';
import { EvilComposedChart } from '@/components/charts/composed-chart';
import { EvilSankeyChart, type SankeyData } from '@/components/charts/sankey-chart';
import { StatCard } from '@/components/stat-card';
import {
  catVisual,
  STATUS_COLOR,
  STAT_META,
  STATUS_META,
  type Stat,
} from '@/lib/data';

export default function Dashboard() {
  const listings = useQuery(api.listings.list, {}) ?? [];
  const overview = useQuery(api.stats.overview);
  const setStatus = useMutation(api.listings.setStatus);

  const recent = listings.slice(0, 5);
  const queue = listings.filter((l) => l.status === 'pending');

  // Stat cards — real values mapped onto presentation metadata.
  const stats: Stat[] = STAT_META.map((m) => ({
    label: m.label,
    icon: m.icon,
    tint: m.tint,
    suffix: m.suffix,
    decimals: m.decimals,
    delta: '',
    up: true,
    value: overview
      ? m.key === 'listings'
        ? overview.totals.listings
        : m.key === 'pending'
          ? overview.totals.pending
          : m.key === 'users'
            ? overview.totals.users
            : overview.totals.revenue
      : 0,
  }));

  // Category share (% of total) from real counts.
  const totalCat = overview?.byCategory.reduce((s, c) => s + c.count, 0) ?? 0;
  const categoryShare =
    overview?.byCategory.map((c) => ({
      name: catVisual(c.slug).name,
      color: catVisual(c.slug).grad[1],
      value: totalCat ? Math.round((c.count / totalCat) * 100) : 0,
    })) ?? [];

  // Composed chart: real daily listings (bars) + revenue in mln soʻm (line).
  const composed =
    overview?.daily.listings.map((d, i) => ({
      day: d.x,
      elonlar: d.v,
      daromad: +((overview.daily.revenue[i]?.v ?? 0) / 1000).toFixed(1), // ming → mln
    })) ?? [];

  // Sankey: category → status, built from the real matrix.
  const sankey: SankeyData = (() => {
    if (!overview) return { nodes: [], links: [] };
    const cats = overview.categoryStatus;
    const nodes = [
      ...cats.map((c) => ({ name: catVisual(c.slug).name, color: catVisual(c.slug).grad[1] })),
      { name: 'Faol', color: STATUS_COLOR.active },
      { name: 'Tekshiruvda', color: STATUS_COLOR.pending },
      { name: 'Rad etilgan', color: STATUS_COLOR.rejected },
    ];
    const base = cats.length;
    const links: SankeyData['links'] = [];
    cats.forEach((c, i) => {
      if (c.active) links.push({ source: i, target: base, value: c.active });
      if (c.pending) links.push({ source: i, target: base + 1, value: c.pending });
      if (c.rejected) links.push({ source: i, target: base + 2, value: c.rejected });
    });
    return { nodes, links };
  })();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Boshqaruv paneli</h1>
          <p className="mt-0.5 text-sm text-neutral-500">
            Xush kelibsiz! Jonli statistika.
          </p>
        </div>
        <Button variant="secondary" className="gap-2">
          <Download size={17} />
          Hisobot
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} stat={s} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          { label: 'Promo revenue', value: overview?.money.revenue ?? 0, icon: Megaphone, tint: '#0A6CFF' },
          { label: 'Stripe cash-in', value: overview?.money.stripeCashIn ?? 0, icon: CreditCard, tint: '#635BFF' },
          { label: 'Wallet top-up', value: overview?.money.walletTopups ?? 0, icon: Wallet, tint: '#8B5CF6' },
          { label: 'Pending money', value: overview?.money.pendingAmount ?? 0, icon: Banknote, tint: '#F59E0B' },
        ].map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.label} className="rounded-2xl border border-neutral-200 bg-white shadow-none">
              <Card.Content className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${m.tint}16` }}>
                  <Icon size={20} style={{ color: m.tint }} />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-neutral-400">{m.label}</p>
                  <p className="text-lg font-bold text-neutral-900">
                    {m.value.toLocaleString('ru-RU')} so'm
                  </p>
                </div>
              </Card.Content>
            </Card>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Composed chart: listings + revenue */}
        <Card className="rounded-2xl border border-neutral-200 bg-white shadow-none lg:col-span-2">
          <Card.Header className="flex items-center justify-between p-5 pb-0">
            <div>
              <Card.Title className="text-base font-semibold text-neutral-900">
                Haftalik eʼlonlar va daromad
              </Card.Title>
              <div className="mt-1.5 flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-xs text-neutral-500">
                  <span className="h-2 w-2 rounded-full bg-accent" /> Eʼlonlar
                </span>
                <span className="flex items-center gap-1.5 text-xs text-neutral-500">
                  <span className="h-2 w-2 rounded-full bg-green-600" /> Daromad (mln)
                </span>
              </div>
            </div>
          </Card.Header>
          <Card.Content className="p-3">
            <EvilComposedChart data={composed} />
          </Card.Content>
        </Card>

        {/* Category share */}
        <Card className="rounded-2xl border border-neutral-200 bg-white shadow-none">
          <Card.Header className="p-5 pb-0">
            <Card.Title className="text-base font-semibold text-neutral-900">
              Kategoriyalar boʻyicha
            </Card.Title>
          </Card.Header>
          <Card.Content className="space-y-4 p-5">
            {categoryShare.length === 0 && (
              <p className="py-6 text-center text-sm text-neutral-400">Maʼlumot yoʻq</p>
            )}
            {categoryShare.map((c) => (
              <div key={c.name}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-neutral-600">{c.name}</span>
                  <span className="font-medium text-neutral-900">{c.value}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${c.value}%`, backgroundColor: c.color }}
                  />
                </div>
              </div>
            ))}
          </Card.Content>
        </Card>
      </div>

      {/* Sankey: category → status flow */}
      <Card className="rounded-2xl border border-neutral-200 bg-white shadow-none">
        <Card.Header className="flex items-center justify-between p-5 pb-0">
          <div>
            <Card.Title className="text-base font-semibold text-neutral-900">
              Eʼlonlar oqimi
            </Card.Title>
            <Card.Description className="mt-0.5 text-sm text-neutral-400">
              Kategoriya → tekshiruv holati boʻyicha taqsimot
            </Card.Description>
          </div>
        </Card.Header>
        <Card.Content className="p-3">
          <EvilSankeyChart data={sankey} />
        </Card.Content>
      </Card>

      {/* Table + queue */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent listings */}
        <Card className="rounded-2xl border border-neutral-200 bg-white shadow-none lg:col-span-2">
          <Card.Header className="flex items-center justify-between p-5 pb-3">
            <Card.Title className="text-base font-semibold text-neutral-900">
              Soʻnggi eʼlonlar
            </Card.Title>
            <Button variant="tertiary" size="sm">
              Barchasi
            </Button>
          </Card.Header>
          <Card.Content className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-y border-neutral-200 text-xs uppercase text-neutral-400">
                    <th className="px-5 py-3 font-medium">Eʼlon</th>
                    <th className="px-5 py-3 font-medium">Kategoriya</th>
                    <th className="px-5 py-3 font-medium">Narx</th>
                    <th className="px-5 py-3 font-medium">Holat</th>
                    <th className="px-5 py-3 font-medium">Sana</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((l) => {
                    const s = STATUS_META[l.status];
                    return (
                      <tr
                        key={l._id}
                        className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
                      >
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-neutral-900">{l.title}</p>
                          <p className="text-xs text-neutral-400">{l.sellerName}</p>
                        </td>
                        <td className="px-5 py-3.5 text-neutral-600">{catVisual(l.category).name}</td>
                        <td className="px-5 py-3.5 font-medium text-neutral-900">{l.price}</td>
                        <td className="px-5 py-3.5">
                          <Chip variant="soft" color={s.color} size="sm">
                            {s.label}
                          </Chip>
                        </td>
                        <td className="px-5 py-3.5 text-neutral-500">{new Date(l.createdAt).toLocaleDateString('ru-RU')}</td>
                      </tr>
                    );
                  })}
                  {recent.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-sm text-neutral-400">
                        Hali eʼlon yoʻq
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card.Content>
        </Card>

        {/* Moderation queue */}
        <Card className="rounded-2xl border border-neutral-200 bg-white shadow-none">
          <Card.Header className="flex items-center justify-between p-5 pb-3">
            <Card.Title className="text-base font-semibold text-neutral-900">
              Tekshiruv navbati
            </Card.Title>
            <Chip variant="soft" color="warning" size="sm">
              {queue.length} ta
            </Chip>
          </Card.Header>
          <Card.Content className="space-y-3 p-5">
            {queue.length === 0 && (
              <p className="py-4 text-center text-sm text-neutral-400">Navbat boʻsh 🎉</p>
            )}
            {queue.map((l) => (
              <div key={l._id} className="rounded-xl border border-neutral-200 p-3">
                <p className="text-sm font-medium text-neutral-900">{l.title}</p>
                <p className="mt-0.5 text-xs text-neutral-400">
                  {catVisual(l.category).name} · {l.price}
                </p>
                <p className="mt-0.5 text-xs text-neutral-400">{new Date(l.createdAt).toLocaleDateString('ru-RU')}</p>
                <div className="mt-2.5 flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1 gap-1"
                    onPress={() => setStatus({ id: l._id, status: 'active' })}
                  >
                    <Check size={15} />
                    Tasdiqlash
                  </Button>
                  <Button
                    variant="danger-soft"
                    size="sm"
                    className="flex-1 gap-1"
                    onPress={() => setStatus({ id: l._id, status: 'rejected' })}
                  >
                    <X size={15} />
                    Rad etish
                  </Button>
                </div>
              </div>
            ))}
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
