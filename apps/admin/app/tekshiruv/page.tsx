'use client';

import { api } from '@halolmia/backend/convex/_generated/api';
import { Button, Card, Chip } from '@heroui/react';
import { useMutation, useQuery } from 'convex/react';
import { Check, Eye, X } from 'lucide-react';
import { ChartCard } from '@/components/chart-card';
import { BarMini, DonutMini } from '@/components/charts/mini';
import { PageHeader } from '@/components/page-header';
import { catVisual, MOD_DAILY, MOD_RESULT } from '@/lib/data';

export default function TekshiruvPage() {
  const listings = useQuery(api.listings.list, {}) ?? [];
  const setStatus = useMutation(api.listings.setStatus);
  const pending = listings.filter((l) => l.status === 'pending');

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Tekshiruv navbati"
        subtitle="Adminlar tomonidan tasdiqlashni kutayotgan eʼlonlar"
        action={
          <Chip variant="soft" color="warning">
            {pending.length} ta kutilmoqda
          </Chip>
        }
      />

      {/* Charts */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Kunlik tekshirilgan eʼlonlar" subtitle="Soʻnggi 7 kun">
          <BarMini data={MOD_DAILY} color="#F59E0B" />
        </ChartCard>
        <ChartCard title="Tekshiruv natijasi">
          <DonutMini data={MOD_RESULT} />
        </ChartCard>
      </div>

      <div className="space-y-4">
        {pending.length === 0 && (
          <p className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-neutral-400">
            Tekshiruvni kutayotgan eʼlonlar yoʻq 🎉
          </p>
        )}
        {pending.map((l) => {
          const v = catVisual(l.category);
          return (
            <Card key={l._id} className="rounded-2xl border border-neutral-200 bg-white shadow-none">
              <Card.Content className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <div
                  className="flex h-24 w-full items-center justify-center rounded-xl sm:w-32"
                  style={{ background: `linear-gradient(135deg, ${v.grad[0]}, ${v.grad[1]})` }}
                >
                  <span className="text-4xl">{v.emoji}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-neutral-900">{l.title}</p>
                    <Chip variant="soft" color="warning" size="sm">
                      {v.name}
                    </Chip>
                  </div>
                  <p className="mt-1 text-lg font-bold text-neutral-900">{l.price}</p>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    {l.sellerName} · {l.city} · {new Date(l.createdAt).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" className="gap-1">
                    <Eye size={15} />
                    Koʻrish
                  </Button>
                  <Button variant="primary" size="sm" className="gap-1" onPress={() => setStatus({ id: l._id, status: 'active' })}>
                    <Check size={15} />
                    Tasdiqlash
                  </Button>
                  <Button variant="danger-soft" size="sm" className="gap-1" onPress={() => setStatus({ id: l._id, status: 'rejected' })}>
                    <X size={15} />
                    Rad etish
                  </Button>
                </div>
              </Card.Content>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
