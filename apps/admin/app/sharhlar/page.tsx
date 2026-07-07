'use client';

import { api } from '@halolmia/backend/convex/_generated/api';
import { Button, Card, Chip } from '@heroui/react';
import { useMutation, useQuery } from 'convex/react';
import { Star, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/page-header';

function Stars({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          className={i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'}
        />
      ))}
    </span>
  );
}

export default function SharhlarPage() {
  const reviews = useQuery(api.reviews.listAll) ?? [];
  const removeReview = useMutation(api.reviews.remove);

  const avg =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : '—';

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Sharhlar"
        subtitle="Sotuvchilar haqidagi baholar va sharhlar"
        action={
          <Chip variant="soft" color="warning">
            ⌀ {avg} · {reviews.length} ta
          </Chip>
        }
      />

      {reviews.length === 0 ? (
        <Card className="rounded-2xl border border-neutral-200 bg-white shadow-none">
          <Card.Content className="p-8 text-center text-neutral-500">
            Hali sharhlar yoʻq.
          </Card.Content>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={r._id} className="rounded-2xl border border-neutral-200 bg-white shadow-none">
              <Card.Content className="flex items-center gap-4 p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50">
                  <Star size={20} className="fill-amber-400 text-amber-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-neutral-900">{r.authorName}</p>
                    <Stars value={r.rating} />
                  </div>
                  <p className="mt-0.5 text-sm text-neutral-500">
                    Sotuvchi: <span className="text-neutral-700">{r.sellerName}</span>
                  </p>
                  {r.text ? (
                    <p className="mt-1 text-sm text-neutral-700">{r.text}</p>
                  ) : (
                    <p className="mt-1 text-xs italic text-neutral-400">Matnsiz baho</p>
                  )}
                </div>
                <Button
                  variant="tertiary"
                  size="sm"
                  onPress={() => {
                    if (confirm('Sharhni oʻchirasizmi?')) removeReview({ id: r._id });
                  }}
                >
                  <Trash2 size={15} />
                </Button>
              </Card.Content>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
