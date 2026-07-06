'use client';

import { api } from '@halolmia/backend/convex/_generated/api';
import { Button, Chip } from '@heroui/react';
import { useMutation, useQuery } from 'convex/react';
import { Check, Pin, PinOff, Plus, Trash2, X } from 'lucide-react';
import { ChartCard } from '@/components/chart-card';
import { AreaMini, DonutMini } from '@/components/charts/mini';
import { PageHeader } from '@/components/page-header';
import { catVisual, STATUS_COLOR, STATUS_META } from '@/lib/data';

export default function ElonlarPage() {
  const listings = useQuery(api.listings.list, {}) ?? [];
  const overview = useQuery(api.stats.overview);
  const setStatus = useMutation(api.listings.setStatus);
  const removeListing = useMutation(api.listings.remove);
  const setPinned = useMutation(api.listings.setPinned);
  const now = Date.now();
  const daily = overview?.daily.listings ?? [];
  const statusData = overview
    ? [
        { name: 'Faol', value: overview.byStatus.active, color: STATUS_COLOR.active },
        { name: 'Tekshiruvda', value: overview.byStatus.pending, color: STATUS_COLOR.pending },
        { name: 'Rad etilgan', value: overview.byStatus.rejected, color: STATUS_COLOR.rejected },
      ]
    : [];
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
          <AreaMini data={daily} />
        </ChartCard>
        <ChartCard title="Holat boʻyicha taqsimot">
          <DonutMini data={statusData} />
        </ChartCard>
      </div>

      {/* Image-badge grid (Aceternity style) */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {listings.map((l) => {
          const v = catVisual(l.category);
          const s = STATUS_META[l.status];
          const boosted = !!l.boostedUntil && l.boostedUntil > now;
          return (
            <div
              key={l._id}
              className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              {/* "image" */}
              <div
                className="relative flex h-40 items-center justify-center overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${v.grad[0]}, ${v.grad[1]})` }}
              >
                {l.photoUrls?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.photoUrls[0]} alt={l.title} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-6xl drop-shadow-md transition-transform duration-300 group-hover:scale-110">
                    {v.emoji}
                  </span>
                )}
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
                {/* promotion / pin badge */}
                {(l.pinned || boosted) && (
                  <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-xs font-bold text-amber-950 shadow">
                    {l.pinned ? <Pin size={12} /> : null}
                    {l.pinned ? 'Pinned' : (l.tier ? l.tier.toUpperCase() : 'TOP')}
                  </div>
                )}
              </div>
              {/* body */}
              <div className="p-4">
                <p className="truncate font-semibold text-neutral-900">{l.title}</p>
                <p className="mt-1 text-lg font-bold text-neutral-900">{l.price}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-neutral-400">
                  <span>{l.sellerName}</span>
                  <span>{new Date(l.createdAt).toLocaleDateString('ru-RU')}</span>
                </div>

                {/* Admin controls */}
                <div className="mt-3 flex gap-2 border-t border-neutral-100 pt-3">
                  {l.status !== 'active' && (
                    <Button variant="primary" size="sm" className="flex-1 gap-1" onPress={() => setStatus({ id: l._id, status: 'active' })}>
                      <Check size={14} /> Tasdiqlash
                    </Button>
                  )}
                  {l.status !== 'rejected' && (
                    <Button variant="tertiary" size="sm" className="flex-1 gap-1" onPress={() => setStatus({ id: l._id, status: 'rejected' })}>
                      <X size={14} /> Rad etish
                    </Button>
                  )}
                  <Button
                    variant={l.pinned ? 'primary' : 'secondary'}
                    size="sm"
                    onPress={() => setPinned({ id: l._id, pinned: !l.pinned })}
                  >
                    {l.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                  </Button>
                  <Button
                    variant="danger-soft"
                    size="sm"
                    className="gap-1"
                    onPress={() => {
                      if (confirm(`"${l.title}" eʼlonini oʻchirasizmi?`)) removeListing({ id: l._id });
                    }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
