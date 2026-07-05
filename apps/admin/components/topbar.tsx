import { Bell, Search } from 'lucide-react';

export function Topbar() {
  return (
    <header className="flex h-16 items-center gap-4 border-b border-neutral-200 bg-white px-6">
      {/* Search */}
      <div className="flex h-10 w-full max-w-md items-center gap-2 rounded-xl bg-neutral-100 px-3.5">
        <Search size={18} className="text-neutral-400" />
        <input
          placeholder="Eʼlon, foydalanuvchi qidirish..."
          className="w-full bg-transparent text-sm text-neutral-800 outline-none placeholder:text-neutral-400"
        />
      </div>

      <div className="flex-1" />

      {/* Notifications */}
      <button className="relative flex h-10 w-10 items-center justify-center rounded-xl text-neutral-500 hover:bg-neutral-100">
        <Bell size={20} />
        <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
      </button>

      {/* Profile */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
          AD
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-semibold leading-none text-neutral-900">Admin</p>
          <p className="text-xs text-neutral-400">Super admin</p>
        </div>
      </div>
    </header>
  );
}
