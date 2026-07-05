'use client';

import { Button } from '@heroui/react';
import { X } from 'lucide-react';
import { useState } from 'react';
import type { AdPlacement } from '@/lib/data';

export interface NewAdInput {
  advertiser: string;
  emoji: string;
  grad: string[];
  headline: string;
  body: string;
  cta: string;
  url: string;
  placements: string[];
  budget: number;
}

const PRESETS: [string, string][] = [
  ['#B45309', '#F59E0B'],
  ['#0E7490', '#06B6D4'],
  ['#1E3A8A', '#3B82F6'],
  ['#166534', '#22C55E'],
  ['#7C3AED', '#A855F7'],
  ['#BE123C', '#F43F5E'],
];

export function CreateAdModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (ad: NewAdInput) => void;
}) {
  const [advertiser, setAdvertiser] = useState('');
  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [cta, setCta] = useState('Batafsil');
  const [url, setUrl] = useState('https://');
  const [emoji, setEmoji] = useState('📢');
  const [grad, setGrad] = useState<[string, string]>(PRESETS[0]);
  const [budget, setBudget] = useState('');
  const [placements, setPlacements] = useState<AdPlacement[]>(['app', 'bot']);

  if (!open) return null;

  const toggle = (p: AdPlacement) =>
    setPlacements((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const submit = () => {
    onCreate({
      advertiser: advertiser || 'Reklama beruvchi',
      emoji,
      grad,
      headline: headline || 'Sarlavha',
      body: body || 'Reklama matni',
      cta: cta || 'Batafsil',
      url,
      placements: placements.length ? placements : ['app'],
      budget: Number(budget.replace(/\D/g, '')) || 1_000_000,
    });
    onClose();
  };

  const field = 'h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-accent';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-neutral-900">Yangi reklama</h2>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Reklama beruvchi</label>
              <input className={field} value={advertiser} onChange={(e) => setAdvertiser(e.target.value)} placeholder="AgroMix" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Sarlavha</label>
              <input className={field} value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Chorva yemi 20% chegirma" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Matn</label>
              <textarea className={field + ' h-auto py-2'} rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Qisqacha taʼrif" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Tugma matni</label>
                <input className={field} value={cta} onChange={(e) => setCta(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Havola (URL)</label>
                <input className={field} value={url} onChange={(e) => setUrl(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Emoji / logo</label>
                <input className={field} value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={2} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Byudjet (soʻm)</label>
                <input className={field} value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="5 000 000" inputMode="numeric" />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-500">Fon rangi</label>
              <div className="flex gap-2">
                {PRESETS.map((g) => (
                  <button
                    key={g[0]}
                    onClick={() => setGrad(g)}
                    className={`h-8 w-8 rounded-full ring-2 ${grad[0] === g[0] ? 'ring-accent' : 'ring-transparent'}`}
                    style={{ background: `linear-gradient(135deg, ${g[0]}, ${g[1]})` }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-500">Joylashuv</label>
              <div className="flex gap-2">
                {(['app', 'bot'] as AdPlacement[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => toggle(p)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                      placements.includes(p)
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-neutral-200 text-neutral-500'
                    }`}
                  >
                    {p === 'app' ? '📱 Ilova' : '🤖 Bot'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="tertiary" onPress={onClose}>Bekor qilish</Button>
            <Button variant="primary" onPress={submit}>Eʼlon qilish</Button>
          </div>
        </div>

        {/* Live preview */}
        <div className="hidden w-80 shrink-0 flex-col gap-4 border-l border-neutral-200 bg-neutral-50 p-5 md:flex">
          <p className="text-xs font-semibold uppercase text-neutral-400">Jonli koʻrinish</p>

          {/* App banner preview */}
          <div>
            <p className="mb-1.5 text-xs text-neutral-400">📱 Ilovada</p>
            <div className="overflow-hidden rounded-2xl" style={{ background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})` }}>
              <div className="flex items-center gap-3 p-4">
                <span className="text-3xl">{emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{headline || 'Sarlavha'}</p>
                  <p className="truncate text-xs text-white/80">{body || 'Reklama matni'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between bg-black/15 px-4 py-2">
                <span className="text-[10px] uppercase tracking-wide text-white/70">Reklama</span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold" style={{ color: grad[0] }}>{cta}</span>
              </div>
            </div>
          </div>

          {/* Bot card preview */}
          <div>
            <p className="mb-1.5 text-xs text-neutral-400">🤖 Botda</p>
            <div className="rounded-2xl bg-white p-3 shadow-sm">
              <div className="mb-2 flex h-24 items-center justify-center rounded-xl" style={{ background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})` }}>
                <span className="text-4xl">{emoji}</span>
              </div>
              <p className="text-xs text-neutral-400">📢 Reklama · {advertiser || 'Reklama beruvchi'}</p>
              <p className="text-sm font-semibold text-neutral-900">{headline || 'Sarlavha'}</p>
              <p className="text-xs text-neutral-500">{body || 'Reklama matni'}</p>
              <div className="mt-2 rounded-lg bg-accent px-3 py-1.5 text-center text-xs font-semibold text-white">{cta}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
