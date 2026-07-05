'use client';

import { api } from '@halolmia/backend/convex/_generated/api';
import { Button, Card, Chip } from '@heroui/react';
import { useMutation, useQuery } from 'convex/react';
import { ChartCard } from '@/components/chart-card';
import { AreaMini, BarMini } from '@/components/charts/mini';
import { PageHeader } from '@/components/page-header';
import { USER_ACTIVITY, USER_MONTHLY } from '@/lib/data';

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function FoydalanuvchilarPage() {
  const users = useQuery(api.users.list) ?? [];
  const setStatus = useMutation(api.users.setStatus);
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Foydalanuvchilar" subtitle={`Jami ${users.length} ta roʻyxatdan oʻtgan foydalanuvchi`} />

      {/* Charts */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Foydalanuvchilar oʻsishi" subtitle="Soʻnggi 6 oy">
          <AreaMini data={USER_MONTHLY} color="#16A34A" />
        </ChartCard>
        <ChartCard title="Faollik boʻyicha">
          <BarMini data={USER_ACTIVITY} />
        </ChartCard>
      </div>

      <Card className="rounded-2xl border border-neutral-200 bg-white shadow-none">
        <Card.Content className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-xs uppercase text-neutral-400">
                  <th className="px-5 py-3 font-medium">Foydalanuvchi</th>
                  <th className="px-5 py-3 font-medium">Telefon</th>
                  <th className="px-5 py-3 font-medium">Eʼlonlar</th>
                  <th className="px-5 py-3 font-medium">Roʻyxatdan oʻtgan</th>
                  <th className="px-5 py-3 font-medium">Holat</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
                          {initials(u.name)}
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900">{u.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-neutral-600">{u.phone}</td>
                    <td className="px-5 py-3.5 font-medium text-neutral-900">{u.listings}</td>
                    <td className="px-5 py-3.5 text-neutral-500">{u.joined}</td>
                    <td className="px-5 py-3.5">
                      <Chip variant="soft" color={u.status === 'active' ? 'success' : 'danger'} size="sm">
                        {u.status === 'active' ? 'Faol' : 'Bloklangan'}
                      </Chip>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        variant={u.status === 'active' ? 'danger-soft' : 'secondary'}
                        size="sm"
                        onPress={() => setStatus({ id: u._id, status: u.status === 'active' ? 'blocked' : 'active' })}
                      >
                        {u.status === 'active' ? 'Bloklash' : 'Ochish'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
