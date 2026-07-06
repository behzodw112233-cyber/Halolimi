'use client';

import { api } from '@halolmia/backend/convex/_generated/api';
import { Button, Card, Chip } from '@heroui/react';
import { useMutation, useQuery } from 'convex/react';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { CreateCategoryModal } from '@/components/categories/create-category-modal';
import { ChartCard } from '@/components/chart-card';
import { BarMini, DonutMini } from '@/components/charts/mini';
import { PageHeader } from '@/components/page-header';
import { catVisual } from '@/lib/data';

export default function KategoriyalarPage() {
  const categories = useQuery(api.categories.withCounts) ?? [];
  const overview = useQuery(api.stats.overview);
  const createCategory = useMutation(api.categories.create);
  const setActive = useMutation(api.categories.setActive);
  const removeCategory = useMutation(api.categories.remove);
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
        {categories.map((c) => {
          const v = catVisual(c.slug);
          return (
            <Card key={c._id} className="rounded-2xl border border-neutral-200 bg-white shadow-none">
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
                <div className="mt-3 flex gap-2 border-t border-neutral-100 pt-3">
                  <Button
                    variant={c.active ? 'tertiary' : 'primary'}
                    size="sm"
                    className="flex-1"
                    onPress={() => setActive({ id: c._id, active: !c.active })}
                  >
                    {c.active ? 'Yopish' : 'Faollashtirish'}
                  </Button>
                  <Button
                    variant="danger-soft"
                    size="sm"
                    className="gap-1"
                    onPress={() => {
                      if (confirm(`"${c.name}" kategoriyasini oʻchirasizmi?`)) removeCategory({ id: c._id });
                    }}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </Card.Content>
            </Card>
          );
        })}
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
