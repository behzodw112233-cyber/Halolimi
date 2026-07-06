'use client';

import { api } from '@halolmia/backend/convex/_generated/api';
import { useConvex } from 'convex/react';
import { Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BackgroundRipple } from '@/components/ui/background-ripple';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';

export const ADMIN_KEY = 'halolmi_admin';

export function AdminGate({ children }: { children: React.ReactNode }) {
  const convex = useConvex();
  const [authed, setAuthed] = useState<boolean | null>(null); // null = still checking
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAuthed(typeof window !== 'undefined' && localStorage.getItem(ADMIN_KEY) === 'ok');
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const ok = await convex.query(api.admin.check, { password });
      if (ok) {
        localStorage.setItem(ADMIN_KEY, 'ok');
        setAuthed(true);
      } else {
        setError('Notoʻgʻri parol');
      }
    } catch {
      setError('Xatolik yuz berdi');
    } finally {
      setBusy(false);
    }
  };

  // Avoid a flash of either state until we've read localStorage.
  if (authed === null) return null;

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
        <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-white">
              <Lock size={22} />
            </div>
            <h1 className="text-lg font-bold text-neutral-900">Halolmi Admin</h1>
            <p className="mt-1 text-sm text-neutral-500">Davom etish uchun parolni kiriting</p>
          </div>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            placeholder="Parol"
            className="h-11 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-accent"
          />
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={busy || !password}
            className="mt-4 h-11 w-full rounded-lg bg-accent text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? 'Tekshirilmoqda...' : 'Kirish'}
          </button>
        </form>
      </div>
    );
  }

  // Authenticated → the full admin shell.
  return (
    <div className="relative flex h-screen overflow-hidden bg-neutral-50">
      <BackgroundRipple />
      <div className="relative z-10 flex min-w-0 flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
