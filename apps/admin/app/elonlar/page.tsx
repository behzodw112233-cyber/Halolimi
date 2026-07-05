'use client';

import { api } from '@halolmia/backend/convex/_generated/api';
import { Button, Chip } from '@heroui/react';
import { useQuery } from 'convex/react';
import { Plus } from 'lucide-react';
import { ChartCard } from '@/components/chart-card';
import { AreaMini, DonutMini } from '@/components/charts/mini';
import { PageHeader } from '@/components/page-header';
import { catVisual, ELON_DAILY, ELON_STATUS, STATUS_META } from '@/lib/data';

export default function ElonlarPage() {
  const listings = useQuery(api.listings.list, {}) ?? [];
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Eʼlonlar"
        subtitle={`Jami ${listings.length} ta eʼlon`}
        action={
          <Button variant="primary" className="gap-2">
            <Plus size={17} />
            Yangi eʼlon
          </Button>
        }
      />

      {/* Charts */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Kunlik yangi eʼlonlar" subtitle="Soʻnggi 7 kun">
          <AreaMini data={ELON_DAILY} />
        </ChartCard>
        <ChartCard title="Holat boʻyicha taqsimot">
          <DonutMini data={ELON_STATUS} />
        </ChartCard>
      </div>

      {/* Image-badge grid (Aceternity style) */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {listings.map((l) => {
          const v = catVisual(l.category);
          const s = STATUS_META[l.status];
          return (
            <div
              key={l._id}
              className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              {/* "image" */}
              <div
                className="relative flex h-40 items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${v.grad[0]}, ${v.grad[1]})` }}
              >
                <span className="text-6xl drop-shadow-md transition-transform duration-300 group-hover:scale-110">
                  {v.emoji}
                </span>
                {/* status badge */}
                <div className="absolute right-3 top-3">
                  <Chip variant="soft" color={s.color} size="sm" className="bg-white/90 backdrop-blur">
                    {s.label}
                  </Chip>
                </div>
                {/* category badge */}
                <div className="absolute left-3 top-3 rounded-full bg-black/25 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
                  {v.name}
                </div>
              </div>
              {/* body */}
              <div className="p-4">
                <p className="truncate font-semibold text-neutral-900">{l.title}</p>
                <p className="mt-1 text-lg font-bold text-neutral-900">{l.price}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-neutral-400">
                  <span>{l.sellerName}</span>
                  <span>{new Date(l.createdAt).toLocaleDateString('ru-RU')}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
