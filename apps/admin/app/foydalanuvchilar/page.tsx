'use client';

import { api } from '@halolmia/backend/convex/_generated/api';
import { Button, Card, Chip } from '@heroui/react';
import { useMutation, useQuery } from 'convex/react';
import { ShieldCheck, Trash2 } from 'lucide-react';
import { ChartCard } from '@/components/chart-card';
import { AreaMini, BarMini } from '@/components/charts/mini';
import { PageHeader } from '@/components/page-header';
function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function FoydalanuvchilarPage() {
  const users = useQuery(api.users.list) ?? [];
  const requests = useQuery(api.users.accountApprovalRequests) ?? [];
  const overview = useQuery(api.stats.overview);
  const setStatus = useMutation(api.users.setStatus);
  const setDealer = useMutation(api.users.setDealer);
  const setAccountApproval = useMutation(api.users.setAccountApproval);
  const removeUser = useMutation(api.users.remove);
  const pendingRequests = requests.filter((r) => r.approvalStatus === 'pending');

  const monthly = overview?.usersMonthly ?? [];
  const activity = overview
    ? [
        { x: 'Faol', v: overview.userActivity.active },
        { x: 'Bloklangan', v: overview.userActivity.blocked },
      ]
    : [];
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Foydalanuvchilar" subtitle={`Jami ${users.length} ta roʻyxatdan oʻtgan foydalanuvchi`} />

      <Card className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/70 shadow-none">
        <Card.Content className="p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <ShieldCheck size={20} className="text-amber-700" />
                <p className="font-semibold text-neutral-900">Katta profillar tekshiruvi</p>
                {pendingRequests.length > 0 && (
                  <Chip variant="soft" color="warning" size="sm">
                    {pendingRequests.length} pending
                  </Chip>
                )}
              </div>
              <p className="mt-1 text-sm text-neutral-600">
                Fermer, diler yoki big player maqomi Telegram tasdiqdan alohida. Buni admin o'zi tasdiqlaydi.
              </p>
            </div>
          </div>

          {requests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-amber-200 bg-white/60 px-4 py-5 text-sm text-neutral-500">
              Hozircha fermer/diler so'rovlari yo'q.
            </div>
          ) : (
            <div className="grid gap-3">
              {requests.slice(0, 8).map((request) => (
                <div
                  key={request._id}
                  className="flex flex-col gap-3 rounded-xl border border-white bg-white px-4 py-3 shadow-sm lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-neutral-900">{request.accountName}</p>
                      <Chip
                        variant="soft"
                        color={
                          request.approvalStatus === 'approved'
                            ? 'success'
                            : request.approvalStatus === 'rejected'
                              ? 'danger'
                              : 'warning'
                        }
                        size="sm"
                      >
                        {request.approvalStatus === 'approved'
                          ? 'Tasdiqlandi'
                          : request.approvalStatus === 'rejected'
                            ? 'Rad etildi'
                            : 'Pending'}
                      </Chip>
                      <Chip variant="soft" size="sm">
                        {request.kind === 'farm' ? 'Fermer soʻrovi' : 'Diler soʻrovi'}
                      </Chip>
                    </div>
                    <p className="mt-1 text-sm text-neutral-500">
                      Owner: {request.ownerName} · {request.phone} · {request.listingsCount} e'lon
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onPress={() =>
                        setAccountApproval({
                          membershipId: request._id,
                          status: 'approved',
                          officialKind: 'farmer',
                        })
                      }
                    >
                      Fermer qilish
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onPress={() =>
                        setAccountApproval({
                          membershipId: request._id,
                          status: 'approved',
                          officialKind: 'dealer',
                        })
                      }
                    >
                      Diler qilish
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() =>
                        setAccountApproval({
                          membershipId: request._id,
                          status: 'approved',
                          officialKind: 'big_player',
                        })
                      }
                    >
                      Big player
                    </Button>
                    <Button
                      size="sm"
                      variant="danger-soft"
                      onPress={() =>
                        setAccountApproval({
                          membershipId: request._id,
                          status: 'rejected',
                        })
                      }
                    >
                      Rad etish
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Charts */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Foydalanuvchilar oʻsishi" subtitle="Soʻnggi 6 oy">
          <AreaMini data={monthly} color="#16A34A" />
        </ChartCard>
        <ChartCard title="Faollik boʻyicha">
          <BarMini data={activity} />
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
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-neutral-900">{u.name}</p>
                          {(u.verifiedAt || u.telegramId) && (
                            <Chip variant="soft" color="success" size="sm">
                              Tasdiqlangan
                            </Chip>
                          )}
                          {u.isDealer && (
                            <Chip variant="soft" color="accent" size="sm">
                              Diler
                            </Chip>
                          )}
                          {u.officialStatus === 'pending' && (
                            <Chip variant="soft" color="warning" size="sm">
                              Admin tekshiruvda
                            </Chip>
                          )}
                          {u.officialStatus === 'approved' && u.officialKind && !u.isDealer && (
                            <Chip variant="soft" color="accent" size="sm">
                              {u.officialKind === 'farmer'
                                ? 'Fermer'
                                : u.officialKind === 'big_player'
                                  ? 'Big player'
                                  : 'Diler'}
                            </Chip>
                          )}
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
                      <div className="flex justify-end gap-2">
                        <Button
                          variant={u.isDealer ? 'tertiary' : 'secondary'}
                          size="sm"
                          onPress={() => setDealer({ id: u._id, isDealer: !u.isDealer })}
                        >
                          {u.isDealer ? 'Dilerdan olish' : 'Diler qilish'}
                        </Button>
                        <Button
                          variant={u.status === 'active' ? 'danger-soft' : 'secondary'}
                          size="sm"
                          onPress={() => setStatus({ id: u._id, status: u.status === 'active' ? 'blocked' : 'active' })}
                        >
                          {u.status === 'active' ? 'Bloklash' : 'Ochish'}
                        </Button>
                        <Button
                          variant="tertiary"
                          size="sm"
                          onPress={() => {
                            if (confirm(`"${u.name}" foydalanuvchisini oʻchirasizmi?`)) removeUser({ id: u._id });
                          }}
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
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
