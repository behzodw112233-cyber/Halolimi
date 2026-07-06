'use client';

import { api } from '@halolmia/backend/convex/_generated/api';
import { Button, Card, Chip } from '@heroui/react';
import { useMutation, useQuery } from 'convex/react';
import { Flag, Trash2 } from 'lucide-react';
import { ChartCard } from '@/components/chart-card';
import { AreaMini, BarMini } from '@/components/charts/mini';
import { PageHeader } from '@/components/page-header';
export default function ShikoyatlarPage() {
  const reports = useQuery(api.reports.list) ?? [];
  const overview = useQuery(api.stats.overview);
  const resolve = useMutation(api.reports.resolve);
  const removeReport = useMutation(api.reports.remove);
  const newCount = reports.filter((r) => r.status === 'new').length;

  const reasons =
    overview?.reportReasons.map((r) => ({ x: r.reason, v: r.count })) ?? [];
  const daily = overview?.daily.reports ?? [];
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Shikoyatlar"
        subtitle="Foydalanuvchilardan kelgan shikoyatlar"
        action={
          <Chip variant="soft" color="danger">
            {newCount} ta yangi
          </Chip>
        }
      />

      {/* Charts */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Sabab boʻyicha shikoyatlar">
          <BarMini data={reasons} color="#EF4444" />
        </ChartCard>
        <ChartCard title="Kunlik shikoyatlar" subtitle="Soʻnggi 7 kun">
          <AreaMini data={daily} color="#EF4444" />
        </ChartCard>
      </div>

      <div className="space-y-3">
        {reports.map((r) => (
          <Card key={r._id} className="rounded-2xl border border-neutral-200 bg-white shadow-none">
            <Card.Content className="flex items-center gap-4 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50">
                <Flag size={20} className="text-red-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-neutral-900">{r.reason}</p>
                  <Chip variant="soft" color={r.status === 'new' ? 'danger' : 'success'} size="sm">
                    {r.status === 'new' ? 'Yangi' : 'Hal qilingan'}
                  </Chip>
                </div>
                <p className="mt-0.5 text-sm text-neutral-500">
                  Eʼlon: <span className="text-neutral-700">{r.listingTitle}</span>
                </p>
                <p className="mt-0.5 text-xs text-neutral-400">
                  {r.reporter} · {r.date}
                </p>
              </div>
              <div className="flex gap-2">
                {r.status === 'new' && (
                  <Button variant="primary" size="sm" onPress={() => resolve({ id: r._id })}>Hal qilish</Button>
                )}
                <Button
                  variant="tertiary"
                  size="sm"
                  onPress={() => {
                    if (confirm('Shikoyatni oʻchirasizmi?')) removeReport({ id: r._id });
                  }}
                >
                  <Trash2 size={15} />
                </Button>
              </div>
            </Card.Content>
          </Card>
        ))}
      </div>
    </div>
  );
}
