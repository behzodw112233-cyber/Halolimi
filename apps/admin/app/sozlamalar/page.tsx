'use client';

import { api } from '@halolmia/backend/convex/_generated/api';
import { Button, Card } from '@heroui/react';
import { useMutation, useQuery } from 'convex/react';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';

interface SettingsState {
  platformName: string;
  currency: string;
  language: string;
  autoApprove: boolean;
  allowNoPhoto: boolean;
  notifyNewListing: boolean;
  payme: boolean;
  click: boolean;
  uzcard: boolean;
  feedRecencyWeight: number;
  feedPromoWeight: number;
  feedBoostDays: number;
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
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

function Slider({ value, onChange, min, max, step, suffix }: { value: number; onChange: (v: number) => void; min: number; max: number; step: number; suffix?: string }) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-40 cursor-pointer accent-accent"
      />
      <span className="w-16 text-right text-sm font-medium text-neutral-900">
        {value}
        {suffix ? ` ${suffix}` : ''}
      </span>
    </div>
  );
}

function Row({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
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

const fmt = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ');

export default function SozlamalarPage() {
  const settings = useQuery(api.settings.get);
  const overview = useQuery(api.stats.overview);
  const categories = useQuery(api.categories.withCounts) ?? [];
  const save = useMutation(api.settings.update);

  const [form, setForm] = useState<SettingsState | null>(null);
  const [saved, setSaved] = useState(false);

  // Hydrate the form once settings load.
  useEffect(() => {
    if (settings && !form) setForm(settings);
  }, [settings, form]);

  const set = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setSaved(false);
  };

  const onSave = async () => {
    if (!form) return;
    await save(form);
    setSaved(true);
  };

  const activeCats = categories.filter((c) => c.active).length;

  const platformStats = [
    { label: 'Jami eʼlonlar', value: overview?.totals.listings ?? 0 },
    { label: 'Foydalanuvchilar', value: overview?.totals.users ?? 0 },
    { label: 'Faol kategoriyalar', value: activeCats },
  ];

  if (!form) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Sozlamalar" subtitle="Ilova va platforma sozlamalari" />
        <p className="text-sm text-neutral-400">Yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Sozlamalar" subtitle="Ilova va platforma sozlamalari" />

      {/* Real platform figures */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {platformStats.map((s) => (
          <Card key={s.label} className="rounded-2xl border border-neutral-200 bg-white shadow-none">
            <Card.Content className="p-5">
              <p className="text-2xl font-bold text-neutral-900">{fmt(s.value)}</p>
              <p className="mt-0.5 text-sm text-neutral-500">{s.label}</p>
            </Card.Content>
          </Card>
        ))}
      </div>

      <div className="space-y-6">
        <Card className="rounded-2xl border border-neutral-200 bg-white shadow-none">
          <Card.Header className="p-5 pb-0">
            <Card.Title className="text-base font-semibold text-neutral-900">Umumiy</Card.Title>
          </Card.Header>
          <Card.Content className="p-5 pt-2">
            <Row title="Platforma nomi">
              <input
                value={form.platformName}
                onChange={(e) => set('platformName', e.target.value)}
                className="h-9 w-48 rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-accent"
              />
            </Row>
            <Row title="Asosiy valyuta">
              <select
                value={form.currency}
                onChange={(e) => set('currency', e.target.value)}
                className="h-9 w-48 rounded-lg border border-neutral-200 px-2 text-sm outline-none focus:border-accent"
              >
                <option value="UZS">Soʻm (UZS)</option>
                <option value="USD">y.e. (USD)</option>
              </select>
            </Row>
            <Row title="Til">
              <select
                value={form.language}
                onChange={(e) => set('language', e.target.value)}
                className="h-9 w-48 rounded-lg border border-neutral-200 px-2 text-sm outline-none focus:border-accent"
              >
                <option value="uz">Oʻzbekcha</option>
                <option value="ru">Русский</option>
              </select>
            </Row>
          </Card.Content>
        </Card>

        <Card className="rounded-2xl border border-neutral-200 bg-white shadow-none">
          <Card.Header className="p-5 pb-0">
            <Card.Title className="text-base font-semibold text-neutral-900">Moderatsiya</Card.Title>
          </Card.Header>
          <Card.Content className="p-5 pt-2">
            <Row title="Avtomatik tasdiqlash" desc="Yangi eʼlonlar tekshiruvsiz darhol joylanadi">
              <Toggle on={form.autoApprove} onChange={(v) => set('autoApprove', v)} />
            </Row>
            <Row title="Rasmsiz eʼlonlarga ruxsat" desc="Foydalanuvchilar rasm qoʻshmasdan eʼlon bera oladi">
              <Toggle on={form.allowNoPhoto} onChange={(v) => set('allowNoPhoto', v)} />
            </Row>
            <Row title="Yangi eʼlon bildirishnomasi" desc="Har bir yangi eʼlon uchun adminlarga xabar">
              <Toggle on={form.notifyNewListing} onChange={(v) => set('notifyNewListing', v)} />
            </Row>
          </Card.Content>
        </Card>

        <Card className="rounded-2xl border border-neutral-200 bg-white shadow-none">
          <Card.Header className="p-5 pb-0">
            <Card.Title className="text-base font-semibold text-neutral-900">Toʻlov usullari</Card.Title>
          </Card.Header>
          <Card.Content className="p-5 pt-2">
            <Row title="Payme"><Toggle on={form.payme} onChange={(v) => set('payme', v)} /></Row>
            <Row title="Click"><Toggle on={form.click} onChange={(v) => set('click', v)} /></Row>
            <Row title="Uzcard / Humo"><Toggle on={form.uzcard} onChange={(v) => set('uzcard', v)} /></Row>
          </Card.Content>
        </Card>

        <Card className="rounded-2xl border border-neutral-200 bg-white shadow-none">
          <Card.Header className="p-5 pb-0">
            <Card.Title className="text-base font-semibold text-neutral-900">Feed algoritmi</Card.Title>
            <Card.Description className="mt-0.5 text-sm text-neutral-400">
              Eʼlonlar tartibini boshqaring — yangilik va reklama taʼsirini sozlang
            </Card.Description>
          </Card.Header>
          <Card.Content className="p-5 pt-2">
            <Row title="Yangilik vazni" desc="Yangi eʼlonlar qanchalik yuqorida turadi">
              <Slider value={form.feedRecencyWeight} onChange={(v) => set('feedRecencyWeight', v)} min={0} max={5} step={0.5} />
            </Row>
            <Row title="Reklama vazni" desc="Pullik (VIP/LUX) eʼlonlar qanchalik kuchli koʻtariladi">
              <Slider value={form.feedPromoWeight} onChange={(v) => set('feedPromoWeight', v)} min={0} max={5} step={0.5} />
            </Row>
            <Row title="Boost muddati" desc="Reklama nechta kun feed’da yuqorida turadi">
              <Slider value={form.feedBoostDays} onChange={(v) => set('feedBoostDays', v)} min={1} max={60} step={1} suffix="kun" />
            </Row>
          </Card.Content>
        </Card>

        <div className="flex items-center justify-end gap-3">
          {saved && <span className="text-sm text-green-600">Saqlandi ✓</span>}
          <Button variant="primary" onPress={onSave}>Saqlash</Button>
        </div>
      </div>
    </div>
  );
}
