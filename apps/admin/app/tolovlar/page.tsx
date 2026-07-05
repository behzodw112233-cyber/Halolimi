'use client';

import { Card, Chip } from '@heroui/react';
import { ChartCard } from '@/components/chart-card';
import { AreaMini, DonutMini } from '@/components/charts/mini';
import { PageHeader } from '@/components/page-header';
import { PAYMENTS, PAY_DAILY, PAY_METHODS } from '@/lib/data';

const METHOD_COLOR: Record<string, string> = {
  Uzcard: '#1E3A8A',
  Payme: '#33CCCC',
  Click: '#0A6CFF',
};

export default function TolovlarPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Toʻlovlar" subtitle="Reklama va promo toʻlovlari tarixi" />

      {/* Summary */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Bugungi tushum', value: '188 000 soʻm' },
          { label: 'Oylik tushum', value: '24.5M soʻm' },
          { label: 'Muvaffaqiyatli toʻlovlar', value: '1 204' },
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
        <ChartCard title="Kunlik tushum (mln soʻm)" subtitle="Soʻnggi 7 kun">
          <AreaMini data={PAY_DAILY} color="#16A34A" />
        </ChartCard>
        <ChartCard title="Toʻlov usullari ulushi">
          <DonutMini data={PAY_METHODS} />
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
                </tr>
              </thead>
              <tbody>
                {PAYMENTS.map((p) => (
                  <tr key={p.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                    <td className="px-5 py-3.5 font-medium text-neutral-900">{p.id}</td>
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
