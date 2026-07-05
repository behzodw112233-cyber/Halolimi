import type { LucideIcon } from 'lucide-react';
import {
  ClipboardList,
  Clock,
  Users,
  Wallet,
} from 'lucide-react';

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

export interface AdminListing {
  id: string;
  title: string;
  category: string;
  price: string;
  seller: string;
  date: string;
  status: Status;
}

export const RECENT: AdminListing[] = [
  { id: 'HL-1042', title: 'Holshteyn naslli sigir', category: 'Qoramol', price: '18 500 000 soʻm', seller: 'Alisher T.', date: '04.07.2026', status: 'active' },
  { id: 'HL-1041', title: 'Hisor qoʻylari, 4 bosh', category: 'Qoʻy-echki', price: '9 200 000 soʻm', seller: 'Dilnoza K.', date: '04.07.2026', status: 'pending' },
  { id: 'HL-1040', title: 'Qorabayir ot', category: 'Otlar', price: '35 000 000 soʻm', seller: 'Bekzod M.', date: '03.07.2026', status: 'active' },
  { id: 'HL-1039', title: 'Broyler joʻjalari', category: 'Parrandalar', price: '1 250 000 soʻm', seller: 'Sardor A.', date: '03.07.2026', status: 'rejected' },
  { id: 'HL-1038', title: 'Sut echkilari, 2 ta', category: 'Qoʻy-echki', price: '4 800 000 soʻm', seller: 'Malika R.', date: '02.07.2026', status: 'active' },
];

export const QUEUE: AdminListing[] = [
  { id: 'HL-1041', title: 'Hisor qoʻylari, 4 bosh', category: 'Qoʻy-echki', price: '9 200 000 soʻm', seller: 'Dilnoza K.', date: '5 daq oldin', status: 'pending' },
  { id: 'HL-1037', title: 'Angus buqasi', category: 'Qoramol', price: '22 000 000 soʻm', seller: 'Jahongir S.', date: '12 daq oldin', status: 'pending' },
  { id: 'HL-1036', title: 'Quyonlar, 6 ta', category: 'Quyonlar', price: '900 000 soʻm', seller: 'Nodira X.', date: '28 daq oldin', status: 'pending' },
];

export const STATUS_META: Record<Status, { label: string; color: 'success' | 'warning' | 'danger' }> = {
  active: { label: 'Faol', color: 'success' },
  pending: { label: 'Tekshiruvda', color: 'warning' },
  rejected: { label: 'Rad etilgan', color: 'danger' },
};

// Visual (emoji + gradient) per category display name
export const CATEGORY_VISUAL: Record<string, { emoji: string; grad: [string, string] }> = {
  Qoramol: { emoji: '🐄', grad: ['#0F5132', '#16A34A'] },
  'Qoʻy-echki': { emoji: '🐑', grad: ['#B45309', '#F59E0B'] },
  Parrandalar: { emoji: '🐔', grad: ['#9A3412', '#EA580C'] },
  Otlar: { emoji: '🐎', grad: ['#5B21B6', '#8B5CF6'] },
  Quyonlar: { emoji: '🐇', grad: ['#0E7490', '#06B6D4'] },
};

// Extended listings for the Eʼlonlar image grid
export const ELONLAR: AdminListing[] = [
  ...RECENT,
  { id: 'HL-1035', title: 'Qorabayir toychoq', category: 'Otlar', price: '12 000 000 soʻm', seller: 'Ulugʻbek N.', date: '02.07.2026', status: 'active' },
  { id: 'HL-1034', title: 'Kaliforniya quyonlari', category: 'Quyonlar', price: '900 000 soʻm', seller: 'Nodira X.', date: '01.07.2026', status: 'pending' },
  { id: 'HL-1033', title: 'Tuxum tovuqlari, 20 ta', category: 'Parrandalar', price: '1 800 000 soʻm', seller: 'Sanjar B.', date: '01.07.2026', status: 'active' },
  { id: 'HL-1032', title: 'Simmental buqasi', category: 'Qoramol', price: '26 000 000 soʻm', seller: 'Rustam Q.', date: '30.06.2026', status: 'rejected' },
];

export interface AdminUser {
  id: string;
  name: string;
  phone: string;
  listings: number;
  joined: string;
  status: 'active' | 'blocked';
}

export const USERS: AdminUser[] = [
  { id: 'U-2041', name: 'Alisher Toshmatov', phone: '+998 90 123 45 67', listings: 12, joined: '12.03.2026', status: 'active' },
  { id: 'U-2040', name: 'Dilnoza Karimova', phone: '+998 91 234 56 78', listings: 5, joined: '02.04.2026', status: 'active' },
  { id: 'U-2039', name: 'Bekzod Murodov', phone: '+998 93 345 67 89', listings: 23, joined: '18.01.2026', status: 'active' },
  { id: 'U-2038', name: 'Sardor Aliyev', phone: '+998 94 456 78 90', listings: 2, joined: '29.05.2026', status: 'blocked' },
  { id: 'U-2037', name: 'Malika Rahimova', phone: '+998 95 567 89 01', listings: 8, joined: '07.02.2026', status: 'active' },
];

export interface AdminCategory {
  name: string;
  count: number;
  active: boolean;
}

export const CATEGORIES: AdminCategory[] = [
  { name: 'Qoramol', count: 5240, active: true },
  { name: 'Qoʻy-echki', count: 3180, active: true },
  { name: 'Parrandalar', count: 2260, active: true },
  { name: 'Otlar', count: 980, active: true },
  { name: 'Quyonlar', count: 620, active: true },
  { name: 'Baliqlar', count: 210, active: false },
];

export interface AdminReport {
  id: string;
  listing: string;
  reason: string;
  reporter: string;
  date: string;
  status: 'new' | 'resolved';
}

export const REPORTS: AdminReport[] = [
  { id: 'R-311', listing: 'Holshteyn sigir', reason: 'Yolgʻon narx', reporter: 'U-2040', date: '04.07.2026', status: 'new' },
  { id: 'R-310', listing: 'Broyler joʻjalari', reason: 'Spam / takroriy eʼlon', reporter: 'U-2037', date: '03.07.2026', status: 'new' },
  { id: 'R-309', listing: 'Qorabayir ot', reason: 'Notoʻgʻri kategoriya', reporter: 'U-2039', date: '02.07.2026', status: 'resolved' },
  { id: 'R-308', listing: 'Sut echkilari', reason: 'Aloqa raqami ishlamaydi', reporter: 'U-2041', date: '01.07.2026', status: 'new' },
];

// ---- Per-page chart datasets ----

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

export interface AdminPayment {
  id: string;
  user: string;
  type: string;
  method: 'Uzcard' | 'Payme' | 'Click';
  amount: string;
  date: string;
  status: 'success' | 'pending';
}

export const PAYMENTS: AdminPayment[] = [
  { id: 'P-9051', user: 'Alisher T.', type: 'VIP reklama', method: 'Payme', amount: '51 000 soʻm', date: '04.07.2026 14:20', status: 'success' },
  { id: 'P-9050', user: 'Bekzod M.', type: 'LUX reklama', method: 'Click', amount: '102 000 soʻm', date: '04.07.2026 12:03', status: 'success' },
  { id: 'P-9049', user: 'Malika R.', type: 'ZOʻR reklama', method: 'Uzcard', amount: '29 000 soʻm', date: '03.07.2026 18:44', status: 'pending' },
  { id: 'P-9048', user: 'Sardor A.', type: 'AʼLO reklama', method: 'Payme', amount: '6 000 soʻm', date: '03.07.2026 09:12', status: 'success' },
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
