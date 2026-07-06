'use client';

import { api } from '@halolmia/backend/convex/_generated/api';
import type { Id } from '@halolmia/backend/convex/_generated/dataModel';
import { Chip } from '@heroui/react';
import type { FunctionReturnType } from 'convex/server';
import { useMutation, useQuery } from 'convex/react';
import { GripVertical, Pin, PinOff, Sparkles, TrendingUp } from 'lucide-react';
import { Reorder } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { catVisual } from '@/lib/data';

// The shape returned by api.listings.feedManage (listing doc + computed fields).
type FeedItem = FunctionReturnType<typeof api.listings.feedManage>[number];

const TIERS = ['alo', 'zor', 'vip', 'lux'] as const;

export default function FeedPage() {
  const data = useQuery(api.listings.feedManage) ?? [];
  const reorderFeed = useMutation(api.listings.reorderFeed);
  const setFeedBoost = useMutation(api.listings.setFeedBoost);
  const setPinned = useMutation(api.listings.setPinned);
  const promote = useMutation(api.listings.promote);
  const clearPromo = useMutation(api.listings.clearPromo);

  // Local, drag-reorderable copy of the ranked list.
  const [items, setItems] = useState<FeedItem[]>([]);
  const serverSig = data.map((l) => l._id).join(',');
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Adopt the server order whenever it changes (new listing, saved reorder, etc.).
  useEffect(() => {
    setItems(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverSig]);

  const onReorder = (next: FeedItem[]) => {
    setItems(next);
    if (persistTimer.current) clearTimeout(persistTimer.current);
    // Debounce so a drag persists once the admin settles on an order.
    persistTimer.current = setTimeout(() => {
      reorderFeed({ ids: next.map((l) => l._id as Id<'listings'>) });
    }, 600);
  };

  const pinnedCount = items.filter((l) => l.pinned).length;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Feed boshqaruvi"
        subtitle="Har bir eʼlonning feeddagi oʻrnini oʻzingiz boshqaring"
        action={
          <Chip variant="soft" color="accent">
            {items.length} ta faol eʼlon
          </Chip>
        }
      />

      {/* How-it-works legend */}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Legend
          icon={<GripVertical size={16} />}
          title="Suring"
          body="Tortib joyini oʻzgartiring — feed shu tartibda qotadi"
        />
        <Legend
          icon={<TrendingUp size={16} />}
          title="Ustuvorlik"
          body="Raqamni kattalashtiring — eʼlon yuqoriroqqa koʻtariladi"
        />
        <Legend
          icon={<Pin size={16} />}
          title="Featured"
          body={`Pin bosing — eng tepaga qadaladi (${pinnedCount} ta)`}
        />
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-neutral-400">
          Feedda faol eʼlon yoʻq. Eʼlon tasdiqlangach shu yerda koʻrinadi.
        </p>
      ) : (
        <Reorder.Group axis="y" values={items} onReorder={onReorder} className="space-y-3">
          {items.map((l, i) => {
            const v = catVisual(l.category);
            return (
              <Reorder.Item
                key={l._id}
                value={l}
                className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm"
              >
                {/* rank + drag handle */}
                <div className="flex w-8 shrink-0 flex-col items-center text-neutral-400">
                  <span className="text-xs font-bold text-neutral-500">#{i + 1}</span>
                  <GripVertical size={18} className="cursor-grab active:cursor-grabbing" />
                </div>

                {/* thumbnail */}
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl"
                  style={{ background: `linear-gradient(135deg, ${v.grad[0]}, ${v.grad[1]})` }}
                >
                  {l.photoUrls?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.photoUrls[0]} alt={l.title} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl">{v.emoji}</span>
                  )}
                </div>

                {/* info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-semibold text-neutral-900">{l.title}</p>
                    {l.pinned && (
                      <Chip variant="soft" color="warning" size="sm" className="gap-0.5">
                        <Pin size={11} /> Featured
                      </Chip>
                    )}
                    {l.boostActive && l.tier && (
                      <Chip variant="soft" color="accent" size="sm">
                        {l.tier.toUpperCase()}
                      </Chip>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-neutral-400">
                    {l.price} · {v.name} · ball {l.score}
                  </p>
                </div>

                {/* controls */}
                <div className="flex shrink-0 items-center gap-2">
                  {/* manual priority number */}
                  <label className="flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1">
                    <TrendingUp size={13} className="text-neutral-400" />
                    <input
                      key={`${l._id}-${l.feedBoost ?? 0}`}
                      type="number"
                      min={0}
                      defaultValue={l.feedBoost ?? 0}
                      onBlur={(e) => {
                        const val = Number(e.target.value) || 0;
                        if (val !== (l.feedBoost ?? 0))
                          setFeedBoost({ id: l._id as Id<'listings'>, feedBoost: val });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      }}
                      className="w-12 bg-transparent text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                      title="Ustuvorlik (katta = yuqorida)"
                    />
                  </label>

                  {/* tier selector */}
                  <select
                    value={l.boostActive && l.tier ? l.tier : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') clearPromo({ id: l._id as Id<'listings'> });
                      else
                        promote({
                          id: l._id as Id<'listings'>,
                          tier: val as (typeof TIERS)[number],
                        });
                    }}
                    className="h-8 rounded-lg border border-neutral-200 bg-white px-1.5 text-xs outline-none focus:border-accent"
                    title="Reklama darajasi"
                  >
                    <option value="">— tier</option>
                    {TIERS.map((t) => (
                      <option key={t} value={t}>
                        {t.toUpperCase()}
                      </option>
                    ))}
                  </select>

                  {/* pin toggle */}
                  <button
                    onClick={() => setPinned({ id: l._id as Id<'listings'>, pinned: !l.pinned })}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                      l.pinned
                        ? 'bg-amber-400 text-amber-950'
                        : 'border border-neutral-200 text-neutral-400 hover:bg-neutral-100'
                    }`}
                    title={l.pinned ? 'Featureni olib tashlash' : 'Featured qilish'}
                  >
                    {l.pinned ? <PinOff size={15} /> : <Pin size={15} />}
                  </button>
                </div>
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
      )}
    </div>
  );
}

function Legend({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-neutral-200 bg-white p-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-neutral-900">{title}</p>
        <p className="text-xs text-neutral-400">{body}</p>
      </div>
    </div>
  );
}
