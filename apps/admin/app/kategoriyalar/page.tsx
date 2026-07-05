'use client';

import { Button, Card, Chip } from '@heroui/react';
import { Plus } from 'lucide-react';
import { ChartCard } from '@/components/chart-card';
import { BarMini, DonutMini } from '@/components/charts/mini';
import { PageHeader } from '@/components/page-header';
import { CATEGORIES, CATEGORY_SHARE, CATEGORY_VISUAL, CAT_BARS } from '@/lib/data';

export default function KategoriyalarPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Kategoriyalar"
        subtitle="Bozor kategoriyalarini boshqaring"
        action={
          <Button variant="primary" className="gap-2">
            <Plus size={17} />
            Kategoriya qoʻshish
          </Button>
        }
      />

      {/* Charts */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Kategoriya boʻyicha eʼlonlar">
          <BarMini data={CAT_BARS} color="#8B5CF6" />
        </ChartCard>
        <ChartCard title="Ulush boʻyicha">
          <DonutMini data={CATEGORY_SHARE} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((c) => {
          const v = CATEGORY_VISUAL[c.name] ?? { emoji: '🐾', grad: ['#334155', '#64748B'] as [string, string] };
          return (
            <Card key={c.name} className="rounded-2xl border border-neutral-200 bg-white shadow-none">
              <Card.Content className="flex items-center gap-4 p-4">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
                  style={{ background: `linear-gradient(135deg, ${v.grad[0]}, ${v.grad[1]})` }}
                >
                  {v.emoji}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-neutral-900">{c.name}</p>
                  <p className="text-sm text-neutral-400">
                    {c.count.toLocaleString('en-US').replace(/,/g, ' ')} ta eʼlon
                  </p>
                </div>
                <Chip variant="soft" color={c.active ? 'success' : 'default'} size="sm">
                  {c.active ? 'Faol' : 'Yopiq'}
                </Chip>
              </Card.Content>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
