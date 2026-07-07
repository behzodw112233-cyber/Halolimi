'use client';

import { api } from '@halolmia/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CreditCard,
  Flag,
  LayoutDashboard,
  LayoutGrid,
  ClipboardList,
  ListOrdered,
  LogOut,
  Megaphone,
  Settings,
  ShieldCheck,
  Star,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { ADMIN_KEY } from '@/components/admin-gate';

interface NavItem {
  label: string;
  icon: LucideIcon;
  href: string;
}

const NAV: NavItem[] = [
  { label: 'Boshqaruv paneli', icon: LayoutDashboard, href: '/' },
  { label: 'Eʼlonlar', icon: ClipboardList, href: '/elonlar' },
  { label: 'Feed boshqaruvi', icon: ListOrdered, href: '/feed' },
  { label: 'Tekshiruv', icon: ShieldCheck, href: '/tekshiruv' },
  { label: 'Foydalanuvchilar', icon: Users, href: '/foydalanuvchilar' },
  { label: 'Kategoriyalar', icon: LayoutGrid, href: '/kategoriyalar' },
  { label: 'Reklama', icon: Megaphone, href: '/reklama' },
  { label: 'Shikoyatlar', icon: Flag, href: '/shikoyatlar' },
  { label: 'Sharhlar', icon: Star, href: '/sharhlar' },
  { label: 'Toʻlovlar', icon: CreditCard, href: '/tolovlar' },
  { label: 'Sozlamalar', icon: Settings, href: '/sozlamalar' },
];

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const overview = useQuery(api.stats.overview);

  // Live badge counts per route (pending listings, new reports).
  const badgeFor = (href: string): number => {
    if (!overview) return 0;
    if (href === '/tekshiruv') return overview.totals.pending;
    if (href === '/shikoyatlar') return overview.totals.reportsNew;
    return 0;
  };

  return (
    <motion.aside
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      initial={false}
      animate={{ width: open ? 262 : 76 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="relative z-20 flex shrink-0 flex-col overflow-hidden border-r border-neutral-200 bg-white"
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-[18px]">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent">
          <span className="text-lg font-bold text-white">H</span>
        </div>
        <motion.div
          animate={{ opacity: open ? 1 : 0 }}
          transition={{ duration: 0.15 }}
          className="min-w-0 whitespace-nowrap"
        >
          <p className="text-lg font-bold leading-none text-neutral-900">Halolmi</p>
          <p className="text-xs text-neutral-400">Admin panel</p>
        </motion.div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map((item) => {
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const Icon = item.icon;
          const badge = badgeFor(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`group flex w-full items-center gap-3 rounded-xl px-[10px] py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-accent text-white' : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <span className="relative shrink-0">
                <Icon size={20} />
                {/* collapsed badge dot */}
                {badge > 0 && !open ? (
                  <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                ) : null}
              </span>
              <motion.span
                animate={{ opacity: open ? 1 : 0 }}
                transition={{ duration: 0.15 }}
                className="flex-1 whitespace-nowrap text-left"
              >
                {item.label}
              </motion.span>
              {badge > 0 && open ? (
                <motion.span
                  animate={{ opacity: open ? 1 : 0 }}
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
                    isActive ? 'bg-white/25 text-white' : 'bg-red-500 text-white'
                  }`}
                >
                  {badge}
                </motion.span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* Footer / profile */}
      <div className="border-t border-neutral-200 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-sm font-semibold text-neutral-600">
            AD
          </div>
          <motion.div
            animate={{ opacity: open ? 1 : 0 }}
            transition={{ duration: 0.15 }}
            className="min-w-0 flex-1 whitespace-nowrap"
          >
            <p className="truncate text-sm font-medium text-neutral-900">Admin</p>
            <p className="truncate text-xs text-neutral-400">admin@halolmi.uz</p>
          </motion.div>
          <button
            onClick={() => {
              localStorage.removeItem(ADMIN_KEY);
              window.location.reload();
            }}
            className="shrink-0 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-red-500"
            title="Chiqish"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
