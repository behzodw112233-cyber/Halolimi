'use client';

import { Button, Card, Chip } from '@heroui/react';
import { Flag } from 'lucide-react';
import { ChartCard } from '@/components/chart-card';
import { AreaMini, BarMini } from '@/components/charts/mini';
import { PageHeader } from '@/components/page-header';
import { REPORTS, REPORT_DAILY, REPORT_REASONS } from '@/lib/data';

export default function ShikoyatlarPage() {
  const newCount = REPORTS.filter((r) => r.status === 'new').length;
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
          <BarMini data={REPORT_REASONS} color="#EF4444" />
        </ChartCard>
        <ChartCard title="Kunlik shikoyatlar" subtitle="Soʻnggi 7 kun">
          <AreaMini data={REPORT_DAILY} color="#EF4444" />
        </ChartCard>
      </div>

      <div className="space-y-3">
        {REPORTS.map((r) => (
          <Card key={r.id} className="rounded-2xl border border-neutral-200 bg-white shadow-none">
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
                  Eʼlon: <span className="text-neutral-700">{r.listing}</span>
                </p>
                <p className="mt-0.5 text-xs text-neutral-400">
                  {r.id} · {r.reporter} · {r.date}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm">Eʼlonni koʻrish</Button>
                {r.status === 'new' && (
                  <Button variant="primary" size="sm">Hal qilish</Button>
                )}
              </div>
            </Card.Content>
          </Card>
        ))}
      </div>
    </div>
  );
}
