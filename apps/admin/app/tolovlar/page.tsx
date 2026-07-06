'use client';

import { api } from '@halolmia/backend/convex/_generated/api';
import { Button, Card, Chip } from '@heroui/react';
import { useMutation, useQuery } from 'convex/react';
import { Check, Trash2 } from 'lucide-react';
import { ChartCard } from '@/components/chart-card';
import { AreaMini, DonutMini } from '@/components/charts/mini';
import { PageHeader } from '@/components/page-header';
import { CHART_PALETTE, METHOD_COLOR } from '@/lib/data';

const fmtSum = (n: number) => `${n.toLocaleString('en-US').replace(/,/g, ' ')} soʻm`;

export default function TolovlarPage() {
  const payments = useQuery(api.payments.list) ?? [];
  const overview = useQuery(api.stats.overview);
  const setStatus = useMutation(api.payments.setStatus);
  const removePayment = useMutation(api.payments.remove);

  // daily.revenue values are already in thousands of soʻm
  const daily = (overview?.daily.revenue ?? []).map((d) => ({ x: d.x, v: Math.round(d.v) }));
  const methods =
    overview?.paymentMethods.map((m, i) => ({
      name: m.method,
      value: m.count,
      color: METHOD_COLOR[m.method] ?? CHART_PALETTE[i % CHART_PALETTE.length],
    })) ?? [];
  const okCount = overview?.paymentMethods.reduce((s, m) => s + m.count, 0) ?? 0;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Toʻlovlar" subtitle="Reklama va promo toʻlovlari tarixi" />

      {/* Summary */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Bugungi tushum', value: fmtSum(overview?.totals.revenueToday ?? 0) },
          { label: 'Jami tushum', value: fmtSum(overview?.totals.revenue ?? 0) },
          { label: 'Muvaffaqiyatli toʻlovlar', value: String(okCount) },
        ].map((s) => (
          <Card key={s.label} className="rounded-2xl border border-neutral-200 bg-white shadow-none">
            <Card.Content className="p-5">
              <p className="text-sm text-neutral-500">{s.label}</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900">{s.value}</p>
            </Card.Content>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Kunlik tushum (ming soʻm)" subtitle="Soʻnggi 7 kun">
          <AreaMini data={daily} color="#16A34A" />
        </ChartCard>
        <ChartCard title="Toʻlov usullari ulushi">
          <DonutMini data={methods} />
        </ChartCard>
      </div>

      <Card className="rounded-2xl border border-neutral-200 bg-white shadow-none">
        <Card.Content className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-xs uppercase text-neutral-400">
                  <th className="px-5 py-3 font-medium">ID</th>
                  <th className="px-5 py-3 font-medium">Foydalanuvchi</th>
                  <th className="px-5 py-3 font-medium">Xizmat</th>
                  <th className="px-5 py-3 font-medium">Usul</th>
                  <th className="px-5 py-3 font-medium">Summa</th>
                  <th className="px-5 py-3 font-medium">Holat</th>
                  <th className="px-5 py-3 font-medium">Sana</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p._id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                    <td className="px-5 py-3.5 font-medium text-neutral-900">P-{p._id.slice(-5)}</td>
                    <td className="px-5 py-3.5 text-neutral-600">{p.user}</td>
                    <td className="px-5 py-3.5 text-neutral-600">{p.type}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className="rounded-md px-2 py-0.5 text-xs font-semibold text-white"
                        style={{ backgroundColor: METHOD_COLOR[p.method] }}
                      >
                        {p.method}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-neutral-900">{p.amount}</td>
                    <td className="px-5 py-3.5">
                      <Chip variant="soft" color={p.status === 'success' ? 'success' : 'warning'} size="sm">
                        {p.status === 'success' ? 'Muvaffaqiyatli' : 'Kutilmoqda'}
                      </Chip>
                    </td>
                    <td className="px-5 py-3.5 text-neutral-500">{p.date}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex justify-end gap-2">
                        {p.status === 'pending' && (
                          <Button variant="primary" size="sm" className="gap-1" onPress={() => setStatus({ id: p._id, status: 'success' })}>
                            <Check size={14} /> Tasdiqlash
                          </Button>
                        )}
                        <Button
                          variant="tertiary"
                          size="sm"
                          onPress={() => {
                            if (confirm('Toʻlovni oʻchirasizmi?')) removePayment({ id: p._id });
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
