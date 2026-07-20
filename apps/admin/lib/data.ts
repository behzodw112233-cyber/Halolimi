import type { LucideIcon } from 'lucide-react';
import { ClipboardList, Clock, Users, Wallet } from 'lucide-react';

// This file holds ONLY presentation config (labels, icons, colors, gradients).
// All numbers/entities come live from Convex — see `api.stats.overview` and the
// per-entity queries. No mock data lives here.

export interface Stat {
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  delta: string;
  up: boolean;
  icon: LucideIcon;
  tint: string;
}

// Icon + tint + label for each dashboard stat card; the page fills in `value`.
export const STAT_META: {
  key: 'listings' | 'pending' | 'users' | 'revenue';
  label: string;
  icon: LucideIcon;
  tint: string;
  suffix?: string;
  decimals?: number;
}[] = [
  { key: 'listings', label: 'Jami eʼlonlar', icon: ClipboardList, tint: '#0A6CFF' },
  { key: 'pending', label: 'Tekshiruvda', icon: Clock, tint: '#F59E0B' },
  { key: 'users', label: 'Foydalanuvchilar', icon: Users, tint: '#16A34A' },
  { key: 'revenue', label: 'Jami daromad', icon: Wallet, tint: '#8B5CF6', suffix: 'soʻm' },
];

export type Status = 'active' | 'pending' | 'rejected' | 'sold';

export const STATUS_META: Record<Status, { label: string; color: 'success' | 'warning' | 'danger' | 'default' }> = {
  active: { label: 'Faol', color: 'success' },
  pending: { label: 'Tekshiruvda', color: 'warning' },
  rejected: { label: 'Rad etilgan', color: 'danger' },
  sold: { label: 'Sotilgan', color: 'default' },
};

export const STATUS_COLOR: Record<Status, string> = {
  active: '#16A34A',
  pending: '#F59E0B',
  rejected: '#EF4444',
  sold: '#6B7280',
};

// Visual (name + emoji + gradient) per category slug
export const CATEGORY_VISUAL: Record<string, { name: string; emoji: string; grad: [string, string] }> = {
  cattle: { name: 'Qoramol', emoji: '🐄', grad: ['#0F5132', '#16A34A'] },
  sheep: { name: 'Qoʻy-echki', emoji: '🐑', grad: ['#B45309', '#F59E0B'] },
  horses: { name: 'Otlar', emoji: '🐎', grad: ['#5B21B6', '#8B5CF6'] },
  poultry: { name: 'Parrandalar', emoji: '🐔', grad: ['#9A3412', '#EA580C'] },
  pets: { name: 'Uy hayvonlari', emoji: '🐕', grad: ['#1E3A8A', '#3B82F6'] },
  rabbits: { name: 'Quyonlar', emoji: '🐇', grad: ['#0E7490', '#06B6D4'] },
};

export const catVisual = (slug: string) =>
  CATEGORY_VISUAL[slug] ?? { name: slug, emoji: '🐾', grad: ['#334155', '#64748B'] as [string, string] };

// Palette for donut slices without a natural color (payment methods, etc.)
export const CHART_PALETTE = ['#0A6CFF', '#16A34A', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899', '#94A3B8'];

export const METHOD_COLOR: Record<string, string> = {
  Stripe: '#635BFF',
  Wallet: '#0A6CFF',
  Payme: '#33CCCC',
  Click: '#0A6CFF',
  Atmos: '#7C3AED',
  Uzcard: '#1E3A8A',
  inPAY: '#16A34A',
  PayTech: '#111827',
};

// ---- Ads Manager (Meta-style) ----

export type AdStatus = 'active' | 'paused' | 'ended';
export type AdPlacement = 'app' | 'bot';

export const AD_STATUS_META: Record<AdStatus, { label: string; color: 'success' | 'warning' | 'default' }> = {
  active: { label: 'Faol', color: 'success' },
  paused: { label: 'Pauza', color: 'warning' },
  ended: { label: 'Tugagan', color: 'default' },
};
