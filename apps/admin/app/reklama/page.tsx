'use client';

import { api } from '@halolmia/backend/convex/_generated/api';
import { Button, Card, Chip } from '@heroui/react';
import { useMutation, useQuery } from 'convex/react';
import { Pause, Play, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CreateAdModal } from '@/components/ads/create-ad-modal';
import { ChartCard } from '@/components/chart-card';
import { AreaMini, DonutMini } from '@/components/charts/mini';
import { PageHeader } from '@/components/page-header';
import { NumberTicker } from '@/components/ui/number-ticker';
import { ADS_DAILY, AD_PLACEMENT_SHARE, AD_STATUS_META, type AdStatus } from '@/lib/data';

const fmt = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ');

export default function ReklamaPage() {
  const ads = useQuery(api.ads.list) ?? [];
  const createAd = useMutation(api.ads.create);
  const setStatus = useMutation(api.ads.setStatus);
  const [open, setOpen] = useState(false);

  const stats = useMemo(() => {
    const active = ads.filter((a) => a.status === 'active').length;
    const impressions = ads.reduce((s, a) => s + a.impressions, 0);
    const clicks = ads.reduce((s, a) => s + a.clicks, 0);
    const spent = ads.reduce((s, a) => s + a.spent, 0);
    return { active, impressions, clicks, spent };
  }, [ads]);

  const toggleStatus = (id: (typeof ads)[number]['_id'], current: AdStatus) =>
    setStatus({ id, status: current === 'active' ? 'paused' : 'active' });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Reklama boshqaruvi"
        subtitle="Ilova va bot uchun reklama kampaniyalari"
        action={
          <Button variant="primary" className="gap-2" onPress={() => setOpen(true)}>
            <Plus size={17} />
            Yangi reklama
          </Button>
        }
      />

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { label: 'Faol kampaniyalar', value: stats.active },
          { label: 'Koʻrsatishlar', value: stats.impressions },
          { label: 'Bosishlar', value: stats.clicks },
          { label: 'Sarflangan (soʻm)', value: stats.spent },
        ].map((s) => (
          <Card key={s.label} className="rounded-2xl border border-neutral-200 bg-white shadow-none">
            <Card.Content className="p-5">
              <p className="text-2xl font-bold text-neutral-900">
                <NumberTicker value={s.value} />
              </p>
              <p className="mt-0.5 text-sm text-neutral-500">{s.label}</p>
            </Card.Content>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard title="Koʻrsatishlar dinamikasi" subtitle="Soʻnggi 7 kun">
            <AreaMini data={ADS_DAILY} color="#0A6CFF" />
          </ChartCard>
        </div>
        <ChartCard title="Joylashuv boʻyicha">
          <DonutMini data={AD_PLACEMENT_SHARE} />
        </ChartCard>
      </div>

      {/* Campaigns table */}
      <Card className="rounded-2xl border border-neutral-200 bg-white shadow-none">
        <Card.Header className="p-5 pb-3">
          <Card.Title className="text-base font-semibold text-neutral-900">Kampaniyalar</Card.Title>
        </Card.Header>
        <Card.Content className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-y border-neutral-200 text-xs uppercase text-neutral-400">
                  <th className="px-5 py-3 font-medium">Reklama</th>
                  <th className="px-5 py-3 font-medium">Joylashuv</th>
                  <th className="px-5 py-3 font-medium">Holat</th>
                  <th className="px-5 py-3 font-medium">Koʻrsatish</th>
                  <th className="px-5 py-3 font-medium">Bosish</th>
                  <th className="px-5 py-3 font-medium">CTR</th>
                  <th className="px-5 py-3 font-medium">Byudjet</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {ads.map((a) => {
                  const meta = AD_STATUS_META[a.status];
                  const ctr = a.impressions ? ((a.clicks / a.impressions) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={a._id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
                            style={{ background: `linear-gradient(135deg, ${a.grad[0]}, ${a.grad[1] ?? a.grad[0]})` }}
                          >
                            {a.emoji}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-neutral-900">{a.headline}</p>
                            <p className="text-xs text-neutral-400">{a.advertiser}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1">
                          {a.placements.includes('app') && (
                            <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600">📱</span>
                          )}
                          {a.placements.includes('bot') && (
                            <span className="rounded-md bg-green-50 px-1.5 py-0.5 text-xs text-green-600">🤖</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <Chip variant="soft" color={meta.color} size="sm">{meta.label}</Chip>
                      </td>
                      <td className="px-5 py-3.5 text-neutral-700">{fmt(a.impressions)}</td>
                      <td className="px-5 py-3.5 text-neutral-700">{fmt(a.clicks)}</td>
                      <td className="px-5 py-3.5 font-medium text-neutral-900">{ctr}%</td>
                      <td className="px-5 py-3.5 text-neutral-600">
                        <div>{fmt(a.spent)}</div>
                        <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-neutral-100">
                          <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (a.spent / a.budget) * 100)}%` }} />
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {a.status !== 'ended' && (
                          <Button
                            variant={a.status === 'active' ? 'tertiary' : 'primary'}
                            size="sm"
                            className="gap-1"
                            onPress={() => toggleStatus(a._id, a.status)}
                          >
                            {a.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                            {a.status === 'active' ? 'Pauza' : 'Davom'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card.Content>
      </Card>

      <CreateAdModal open={open} onClose={() => setOpen(false)} onCreate={(ad) => createAd(ad)} />
    </div>
  );
}
