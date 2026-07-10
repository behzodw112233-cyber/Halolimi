'use client';

import { api } from '@halolmia/backend/convex/_generated/api';
import type { Doc } from '@halolmia/backend/convex/_generated/dataModel';
import { Button, Card, Chip } from '@heroui/react';
import { useMutation, useQuery } from 'convex/react';
import { Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { CreateCategoryModal } from '@/components/categories/create-category-modal';
import { ChartCard } from '@/components/chart-card';
import { BarMini, DonutMini } from '@/components/charts/mini';
import { PageHeader } from '@/components/page-header';
import { catVisual } from '@/lib/data';

type CategoryRow = Doc<'categories'> & { count: number; breeds: string[] };

function CategoryCard({
  c,
  onToggle,
  onRemove,
  onSetBreeds,
}: {
  c: CategoryRow;
  onToggle: () => void;
  onRemove: () => void;
  onSetBreeds: (breeds: string[]) => void;
}) {
  const v = catVisual(c.slug);
  const [newBreed, setNewBreed] = useState('');

  const addBreed = () => {
    const b = newBreed.trim();
    if (!b || c.breeds.includes(b)) return;
    onSetBreeds([...c.breeds, b]);
    setNewBreed('');
  };

  return (
    <Card className="rounded-2xl border border-neutral-200 bg-white shadow-none">
      <Card.Content className="p-4">
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
            style={{ background: `linear-gradient(135deg, ${v.grad[0]}, ${v.grad[1]})` }}
          >
            {c.emoji}
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
        </div>

        {/* Breed / type editor */}
        <div className="mt-3 border-t border-neutral-100 pt-3">
          <p className="mb-2 text-xs font-medium text-neutral-500">Zotlar ({c.breeds.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {c.breeds.map((b) => (
              <span
                key={b}
                className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700"
              >
                {b}
                <button
                  type="button"
                  aria-label={`${b} ni oʻchirish`}
                  onClick={() => onSetBreeds(c.breeds.filter((x) => x !== b))}
                  className="text-neutral-400 transition-colors hover:text-red-500"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            {c.breeds.length === 0 && <span className="text-xs text-neutral-400">Zot yoʻq</span>}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={newBreed}
              onChange={(e) => setNewBreed(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addBreed();
                }
              }}
              placeholder="Yangi zot qoʻshish"
              className="h-9 flex-1 rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400"
            />
            <Button variant="tertiary" size="sm" onPress={addBreed} isDisabled={!newBreed.trim()}>
              Qoʻshish
            </Button>
          </div>
        </div>

        <div className="mt-3 flex gap-2 border-t border-neutral-100 pt-3">
          <Button variant={c.active ? 'tertiary' : 'primary'} size="sm" className="flex-1" onPress={onToggle}>
            {c.active ? 'Yopish' : 'Faollashtirish'}
          </Button>
          <Button variant="danger-soft" size="sm" className="gap-1" onPress={onRemove}>
            <Trash2 size={15} />
          </Button>
        </div>
      </Card.Content>
    </Card>
  );
}

export default function KategoriyalarPage() {
  const categories = (useQuery(api.categories.withCounts) ?? []) as CategoryRow[];
  const overview = useQuery(api.stats.overview);
  const createCategory = useMutation(api.categories.create);
  const setActive = useMutation(api.categories.setActive);
  const removeCategory = useMutation(api.categories.remove);
  const setBreeds = useMutation(api.categories.setBreeds);
  const [open, setOpen] = useState(false);

  const catBars =
    overview?.byCategory.map((c) => ({ x: catVisual(c.slug).name, v: c.count })) ?? [];
  const catShare =
    overview?.byCategory.map((c) => ({
      name: catVisual(c.slug).name,
      value: c.count,
      color: catVisual(c.slug).grad[1],
    })) ?? [];
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Kategoriyalar"
        subtitle="Bozor kategoriyalarini boshqaring"
        action={
          <Button variant="primary" className="gap-2" onPress={() => setOpen(true)}>
            <Plus size={17} />
            Kategoriya qoʻshish
          </Button>
        }
      />

      {/* Charts */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Kategoriya boʻyicha eʼlonlar">
          <BarMini data={catBars} color="#8B5CF6" />
        </ChartCard>
        <ChartCard title="Ulush boʻyicha">
          <DonutMini data={catShare} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <CategoryCard
            key={c._id}
            c={c}
            onToggle={() => setActive({ id: c._id, active: !c.active })}
            onRemove={() => {
              if (confirm(`"${c.name}" kategoriyasini oʻchirasizmi?`)) removeCategory({ id: c._id });
            }}
            onSetBreeds={(breeds) => setBreeds({ id: c._id, breeds })}
          />
        ))}
      </div>

      <CreateCategoryModal
        open={open}
        onClose={() => setOpen(false)}
        onCreate={async (c) => {
          await createCategory(c);
        }}
      />
    </div>
  );
}
