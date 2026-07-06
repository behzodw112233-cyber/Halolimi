'use client';

import { Button } from '@heroui/react';
import { X } from 'lucide-react';
import { useState } from 'react';

export interface NewCategoryInput {
  slug: string;
  name: string;
  emoji: string;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export function CreateCategoryModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (c: NewCategoryInput) => Promise<void> | void;
}) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [emoji, setEmoji] = useState('🐾');
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const effectiveSlug = slugTouched ? slug : slugify(name);

  const submit = async () => {
    if (!name.trim() || !effectiveSlug) {
      setError('Nom va slug kiritilishi shart');
      return;
    }
    try {
      await onCreate({ name: name.trim(), slug: effectiveSlug, emoji: emoji || '🐾' });
      setName('');
      setSlug('');
      setEmoji('🐾');
      setSlugTouched(false);
      setError('');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik yuz berdi');
    }
  };

  const field = 'h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-accent';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-neutral-900">Yangi kategoriya</h2>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Nomi</label>
              <input
                className={field}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Baliqlar"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-[1fr_5rem] gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Slug</label>
                <input
                  className={field}
                  value={effectiveSlug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(slugify(e.target.value));
                  }}
                  placeholder="fish"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Emoji</label>
                <input className={field + ' text-center'} value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={2} />
              </div>
            </div>

            {/* Preview */}
            <div className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-2xl">{emoji}</div>
              <div>
                <p className="font-semibold text-neutral-900">{name || 'Kategoriya nomi'}</p>
                <p className="text-xs text-neutral-400">{effectiveSlug || 'slug'}</p>
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="tertiary" onPress={onClose}>Bekor qilish</Button>
            <Button variant="primary" onPress={submit}>Qoʻshish</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
