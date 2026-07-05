'use client';

import { Button, Card } from '@heroui/react';
import { useState } from 'react';
import { ChartCard } from '@/components/chart-card';
import { RadialMini } from '@/components/charts/mini';
import { PageHeader } from '@/components/page-header';

function Toggle({ defaultOn = false }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      onClick={() => setOn((v) => !v)}
      className={`relative h-6 w-11 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-neutral-300'}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          on ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}

function Row({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-100 py-4 last:border-0">
      <div>
        <p className="text-sm font-medium text-neutral-900">{title}</p>
        {desc ? <p className="text-xs text-neutral-400">{desc}</p> : null}
      </div>
      {children}
    </div>
  );
}

export default function SozlamalarPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Sozlamalar" subtitle="Ilova va platforma sozlamalari" />

      {/* System status charts */}
      <div className="mb-6 grid gap-6 sm:grid-cols-2">
        <ChartCard title="Serverdan foydalanish">
          <RadialMini value={62} label="Xotira" color="#0A6CFF" />
        </ChartCard>
        <ChartCard title="Ishlash vaqti">
          <RadialMini value={99} label="Uptime" color="#16A34A" />
        </ChartCard>
      </div>

      <div className="space-y-6">
        <Card className="rounded-2xl border border-neutral-200 bg-white shadow-none">
          <Card.Header className="p-5 pb-0">
            <Card.Title className="text-base font-semibold text-neutral-900">Umumiy</Card.Title>
          </Card.Header>
          <Card.Content className="p-5 pt-2">
            <Row title="Platforma nomi">
              <input
                defaultValue="Halolmi"
                className="h-9 w-48 rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-accent"
              />
            </Row>
            <Row title="Asosiy valyuta">
              <select className="h-9 w-48 rounded-lg border border-neutral-200 px-2 text-sm outline-none focus:border-accent">
                <option>Soʻm (UZS)</option>
                <option>y.e. (USD)</option>
              </select>
            </Row>
            <Row title="Til">
              <select className="h-9 w-48 rounded-lg border border-neutral-200 px-2 text-sm outline-none focus:border-accent">
                <option>Oʻzbekcha</option>
                <option>Русский</option>
              </select>
            </Row>
          </Card.Content>
        </Card>

        <Card className="rounded-2xl border border-neutral-200 bg-white shadow-none">
          <Card.Header className="p-5 pb-0">
            <Card.Title className="text-base font-semibold text-neutral-900">Moderatsiya</Card.Title>
          </Card.Header>
          <Card.Content className="p-5 pt-2">
            <Row title="Avtomatik tasdiqlash" desc="Ishonchli sotuvchilar eʼlonlarini avtomatik joylash">
              <Toggle />
            </Row>
            <Row title="Rasmsiz eʼlonlarga ruxsat" desc="Foydalanuvchilar rasm qoʻshmasdan eʼlon bera oladi">
              <Toggle defaultOn />
            </Row>
            <Row title="Yangi eʼlon bildirishnomasi" desc="Har bir yangi eʼlon uchun adminlarga xabar">
              <Toggle defaultOn />
            </Row>
          </Card.Content>
        </Card>

        <Card className="rounded-2xl border border-neutral-200 bg-white shadow-none">
          <Card.Header className="p-5 pb-0">
            <Card.Title className="text-base font-semibold text-neutral-900">Toʻlov usullari</Card.Title>
          </Card.Header>
          <Card.Content className="p-5 pt-2">
            <Row title="Payme"><Toggle defaultOn /></Row>
            <Row title="Click"><Toggle defaultOn /></Row>
            <Row title="Uzcard / Humo"><Toggle defaultOn /></Row>
          </Card.Content>
        </Card>

        <div className="flex justify-end">
          <Button variant="primary">Saqlash</Button>
        </div>
      </div>
    </div>
  );
}
