import type { LucideIcon } from 'lucide-react';
import { ClipboardList, Clock, Users, Wallet } from 'lucide-react';

// NOTE: Entity data (listings, categories, ads, users, reports, payments) comes
// from Convex. This file only holds display config + chart/analytics mock.

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

export const STATS: Stat[] = [
  { label: 'Jami eʼlonlar', value: 12480, delta: '+8.2%', up: true, icon: ClipboardList, tint: '#0A6CFF' },
  { label: 'Tekshiruvda', value: 34, delta: '+12', up: true, icon: Clock, tint: '#F59E0B' },
  { label: 'Foydalanuvchilar', value: 8210, delta: '+3.1%', up: true, icon: Users, tint: '#16A34A' },
  { label: 'Oylik daromad', value: 24.5, decimals: 1, suffix: 'M soʻm', delta: '-1.4%', up: false, icon: Wallet, tint: '#8B5CF6' },
];

// Composed chart: weekly listings (bars) + revenue in mln soʻm (line)
export const COMPOSED = [
  { day: 'Du', elonlar: 120, daromad: 3.2 },
  { day: 'Se', elonlar: 180, daromad: 4.1 },
  { day: 'Ch', elonlar: 150, daromad: 3.6 },
  { day: 'Pa', elonlar: 220, daromad: 5.4 },
  { day: 'Ju', elonlar: 260, daromad: 6.0 },
  { day: 'Sh', elonlar: 310, daromad: 7.8 },
  { day: 'Ya', elonlar: 240, daromad: 5.9 },
];

// Sankey: category → moderation status flow
export const SANKEY = {
  nodes: [
    { name: 'Qoramol', color: '#0A6CFF' },
    { name: 'Qoʻy-echki', color: '#16A34A' },
    { name: 'Parrandalar', color: '#F59E0B' },
    { name: 'Otlar', color: '#8B5CF6' },
    { name: 'Faol', color: '#16A34A' },
    { name: 'Tekshiruvda', color: '#F59E0B' },
    { name: 'Rad etilgan', color: '#EF4444' },
  ],
  links: [
    { source: 0, target: 4, value: 320 },
    { source: 0, target: 5, value: 40 },
    { source: 0, target: 6, value: 18 },
    { source: 1, target: 4, value: 210 },
    { source: 1, target: 5, value: 30 },
    { source: 1, target: 6, value: 12 },
    { source: 2, target: 4, value: 140 },
    { source: 2, target: 5, value: 22 },
    { source: 2, target: 6, value: 16 },
    { source: 3, target: 4, value: 70 },
    { source: 3, target: 5, value: 10 },
    { source: 3, target: 6, value: 8 },
  ],
};

export const CATEGORY_SHARE = [
  { name: 'Qoramol', value: 42, color: '#0A6CFF' },
  { name: 'Qoʻy-echki', value: 26, color: '#16A34A' },
  { name: 'Parrandalar', value: 18, color: '#F59E0B' },
  { name: 'Otlar', value: 8, color: '#8B5CF6' },
  { name: 'Boshqa', value: 6, color: '#94A3B8' },
];

export type Status = 'active' | 'pending' | 'rejected';

export const STATUS_META: Record<Status, { label: string; color: 'success' | 'warning' | 'danger' }> = {
  active: { label: 'Faol', color: 'success' },
  pending: { label: 'Tekshiruvda', color: 'warning' },
  rejected: { label: 'Rad etilgan', color: 'danger' },
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

// ---- Per-page chart datasets (analytics mock) ----

export const ELON_DAILY = [
  { x: 'Du', v: 120 }, { x: 'Se', v: 180 }, { x: 'Ch', v: 150 },
  { x: 'Pa', v: 220 }, { x: 'Ju', v: 260 }, { x: 'Sh', v: 310 }, { x: 'Ya', v: 240 },
];
export const ELON_STATUS = [
  { name: 'Faol', value: 820, color: '#16A34A' },
  { name: 'Tekshiruvda', value: 120, color: '#F59E0B' },
  { name: 'Rad etilgan', value: 60, color: '#EF4444' },
];

export const MOD_DAILY = [
  { x: 'Du', v: 40 }, { x: 'Se', v: 62 }, { x: 'Ch', v: 55 },
  { x: 'Pa', v: 70 }, { x: 'Ju', v: 88 }, { x: 'Sh', v: 96 }, { x: 'Ya', v: 74 },
];
export const MOD_RESULT = [
  { name: 'Tasdiqlangan', value: 480, color: '#16A34A' },
  { name: 'Rad etilgan', value: 90, color: '#EF4444' },
];

export const USER_MONTHLY = [
  { x: 'Fev', v: 3200 }, { x: 'Mar', v: 4100 }, { x: 'Apr', v: 5300 },
  { x: 'May', v: 6400 }, { x: 'Iyn', v: 7300 }, { x: 'Iyl', v: 8210 },
];
export const USER_ACTIVITY = [
  { x: 'Faol', v: 6200 }, { x: 'Nofaol', v: 1800 }, { x: 'Yangi', v: 210 },
];

export const CAT_BARS = [
  { x: 'Qoramol', v: 5240 }, { x: 'Qoʻy-echki', v: 3180 }, { x: 'Parranda', v: 2260 },
  { x: 'Otlar', v: 980 }, { x: 'Quyon', v: 620 }, { x: 'Baliq', v: 210 },
];

export const REPORT_REASONS = [
  { x: 'Yolgʻon narx', v: 34 }, { x: 'Spam', v: 28 }, { x: 'Kategoriya', v: 19 },
  { x: 'Aloqa', v: 14 }, { x: 'Boshqa', v: 9 },
];
export const REPORT_DAILY = [
  { x: 'Du', v: 6 }, { x: 'Se', v: 9 }, { x: 'Ch', v: 5 },
  { x: 'Pa', v: 12 }, { x: 'Ju', v: 8 }, { x: 'Sh', v: 11 }, { x: 'Ya', v: 7 },
];

export const PAY_DAILY = [
  { x: 'Du', v: 2.4 }, { x: 'Se', v: 3.1 }, { x: 'Ch', v: 2.8 },
  { x: 'Pa', v: 4.2 }, { x: 'Ju', v: 3.9 }, { x: 'Sh', v: 5.6 }, { x: 'Ya', v: 4.5 },
];
export const PAY_METHODS = [
  { name: 'Payme', value: 46, color: '#33CCCC' },
  { name: 'Click', value: 34, color: '#0A6CFF' },
  { name: 'Uzcard', value: 20, color: '#1E3A8A' },
];

// ---- Ads Manager (Meta-style) ----

export type AdStatus = 'active' | 'paused' | 'ended';
export type AdPlacement = 'app' | 'bot';

export const AD_STATUS_META: Record<AdStatus, { label: string; color: 'success' | 'warning' | 'default' }> = {
  active: { label: 'Faol', color: 'success' },
  paused: { label: 'Pauza', color: 'warning' },
  ended: { label: 'Tugagan', color: 'default' },
};

export const ADS_DAILY = [
  { x: 'Du', v: 12400 }, { x: 'Se', v: 15800 }, { x: 'Ch', v: 14200 },
  { x: 'Pa', v: 19600 }, { x: 'Ju', v: 22100 }, { x: 'Sh', v: 26800 }, { x: 'Ya', v: 21300 },
];

export const AD_PLACEMENT_SHARE = [
  { name: '📱 Ilova', value: 58, color: '#0A6CFF' },
  { name: '🤖 Bot', value: 42, color: '#16A34A' },
];
