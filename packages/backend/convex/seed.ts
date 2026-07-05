import { mutation } from './_generated/server';

const CATEGORIES = [
  { slug: 'cattle', name: 'Qoramol', emoji: '🐄', order: 0 },
  { slug: 'sheep', name: 'Qoʻy va echkilar', emoji: '🐑', order: 1 },
  { slug: 'horses', name: 'Otlar', emoji: '🐎', order: 2 },
  { slug: 'poultry', name: 'Parrandalar', emoji: '🐔', order: 3 },
  { slug: 'pets', name: 'Uy hayvonlari', emoji: '🐕', order: 4 },
  { slug: 'rabbits', name: 'Quyonlar', emoji: '🐇', order: 5 },
];

const LISTINGS = [
  {
    title: 'Holshteyn naslli sigir', price: '18 500 000 soʻm', category: 'cattle', city: 'Toshkent',
    phone: '+998 90 123 45 67', sellerName: 'Alisher T.', status: 'active' as const,
    specs: [{ label: 'Yoshi', value: '3 yosh' }, { label: 'Vazni', value: '480 kg' }, { label: 'Zot', value: 'Sut zoti' }],
    desc: 'Sogʻlom, sut beradi. Barcha vaksinalar qilingan.',
  },
  {
    title: 'Hisor qoʻylari, 4 bosh', price: '9 200 000 soʻm', category: 'sheep', city: 'Samarqand',
    phone: '+998 91 234 56 78', sellerName: 'Dilnoza K.', status: 'active' as const,
    specs: [{ label: 'Yoshi', value: '1.5 yosh' }, { label: 'Vazni', value: '70 kg' }, { label: 'Zot', value: 'Hisor' }],
    desc: 'Semiz, qurbonlik uchun ham mos.',
  },
  {
    title: 'Qorabayir ot, yugurik', price: '35 000 000 soʻm', category: 'horses', city: 'Qashqadaryo',
    phone: '+998 93 345 67 89', sellerName: 'Bekzod M.', status: 'active' as const,
    specs: [{ label: 'Yoshi', value: '5 yosh' }, { label: 'Zot', value: 'Qorabayir' }, { label: 'Jinsi', value: 'Aygʻir' }],
    desc: 'Zotli, hujjatlari bor.',
  },
  {
    title: 'Broyler joʻjalari, 50 ta', price: '1 250 000 soʻm', category: 'poultry', city: 'Andijon',
    phone: '+998 94 456 78 90', sellerName: 'Sardor A.', status: 'active' as const,
    specs: [{ label: 'Yoshi', value: '1 oylik' }, { label: 'Turi', value: 'Broyler' }, { label: 'Soni', value: '50 ta' }],
    desc: 'Optom va dona narxlarda mavjud.',
  },
  {
    title: 'Angus buqasi', price: '26 000 000 soʻm', category: 'cattle', city: 'Jizzax',
    phone: '+998 95 567 89 01', sellerName: 'Jahongir S.', status: 'pending' as const,
    specs: [{ label: 'Yoshi', value: '2 yosh' }, { label: 'Vazni', value: '520 kg' }, { label: 'Zot', value: 'Angus' }],
    desc: 'Goʻsht zoti, tez oʻsadi.',
  },
  {
    title: 'Kaliforniya quyonlari', price: '900 000 soʻm', category: 'rabbits', city: 'Namangan',
    phone: '+998 90 678 90 12', sellerName: 'Nodira X.', status: 'active' as const,
    specs: [{ label: 'Yoshi', value: '4 oylik' }, { label: 'Zot', value: 'Kaliforniya' }, { label: 'Soni', value: '6 ta' }],
    desc: 'Naslli quyonlar, sogʻlom.',
  },
];

const ADS = [
  {
    advertiser: 'AgroMix', emoji: '🌾', grad: ['#B45309', '#F59E0B'],
    headline: 'Chorva yemi — 20% chegirma!', body: 'Qoramol va qoʻylar uchun toʻyimli yem. Yetkazib berish bepul.',
    cta: 'Buyurtma berish', url: 'https://agromix.uz', placements: ['app', 'bot'], status: 'active' as const,
    budget: 5_000_000, spent: 2_140_000, impressions: 84200, clicks: 3120, start: '01.07.2026', end: '31.07.2026',
  },
  {
    advertiser: 'VetPlus', emoji: '🩺', grad: ['#0E7490', '#06B6D4'],
    headline: 'Hayvonlaringiz sogʻligʻi biz bilan', body: 'Vaksinatsiya, tekshiruv va davolash. 24/7 shifokor.',
    cta: 'Qoʻngʻiroq qilish', url: 'https://vetplus.uz', placements: ['app'], status: 'active' as const,
    budget: 3_000_000, spent: 980_000, impressions: 41200, clicks: 1180, start: '28.06.2026', end: '28.07.2026',
  },
  {
    advertiser: 'Agrobank', emoji: '💳', grad: ['#1E3A8A', '#3B82F6'],
    headline: 'Fermerlarga imtiyozli kredit', body: 'Yillik 14% dan. Tez rasmiylashtirish, kam hujjat.',
    cta: 'Ariza qoldirish', url: 'https://agrobank.uz', placements: ['bot'], status: 'paused' as const,
    budget: 8_000_000, spent: 3_600_000, impressions: 128400, clicks: 4870, start: '15.06.2026', end: '15.08.2026',
  },
];

const USERS = [
  { name: 'Alisher Toshmatov', phone: '+998 90 123 45 67', listings: 12, joined: '12.03.2026', status: 'active' as const },
  { name: 'Dilnoza Karimova', phone: '+998 91 234 56 78', listings: 5, joined: '02.04.2026', status: 'active' as const },
  { name: 'Bekzod Murodov', phone: '+998 93 345 67 89', listings: 23, joined: '18.01.2026', status: 'active' as const },
  { name: 'Sardor Aliyev', phone: '+998 94 456 78 90', listings: 2, joined: '29.05.2026', status: 'blocked' as const },
  { name: 'Malika Rahimova', phone: '+998 95 567 89 01', listings: 8, joined: '07.02.2026', status: 'active' as const },
];

const REPORTS = [
  { listingTitle: 'Holshteyn sigir', reason: 'Yolgʻon narx', reporter: 'Dilnoza K.', date: '04.07.2026', status: 'new' as const },
  { listingTitle: 'Broyler joʻjalari', reason: 'Spam / takroriy eʼlon', reporter: 'Malika R.', date: '03.07.2026', status: 'new' as const },
  { listingTitle: 'Qorabayir ot', reason: 'Notoʻgʻri kategoriya', reporter: 'Bekzod M.', date: '02.07.2026', status: 'resolved' as const },
  { listingTitle: 'Sut echkilari', reason: 'Aloqa raqami ishlamaydi', reporter: 'Alisher T.', date: '01.07.2026', status: 'new' as const },
];

const PAYMENTS = [
  { user: 'Alisher T.', type: 'VIP reklama', method: 'Payme', amount: '51 000 soʻm', date: '04.07.2026 14:20', status: 'success' as const },
  { user: 'Bekzod M.', type: 'LUX reklama', method: 'Click', amount: '102 000 soʻm', date: '04.07.2026 12:03', status: 'success' as const },
  { user: 'Malika R.', type: 'ZOʻR reklama', method: 'Uzcard', amount: '29 000 soʻm', date: '03.07.2026 18:44', status: 'pending' as const },
  { user: 'Sardor A.', type: 'AʼLO reklama', method: 'Payme', amount: '6 000 soʻm', date: '03.07.2026 09:12', status: 'success' as const },
];

/** One-shot seed. Safe to re-run: clears tables first. */
export const run = mutation({
  args: {},
  handler: async (ctx) => {
    for (const table of ['categories', 'listings', 'ads', 'users', 'reports', 'payments'] as const) {
      const rows = await ctx.db.query(table).collect();
      await Promise.all(rows.map((r) => ctx.db.delete(r._id)));
    }
    for (const c of CATEGORIES) await ctx.db.insert('categories', { ...c, active: true });
    let t = Date.now();
    for (const l of LISTINGS) await ctx.db.insert('listings', { ...l, createdAt: t-- });
    for (const a of ADS) await ctx.db.insert('ads', a);
    for (const u of USERS) await ctx.db.insert('users', u);
    for (const r of REPORTS) await ctx.db.insert('reports', r);
    for (const p of PAYMENTS) await ctx.db.insert('payments', p);
    return {
      categories: CATEGORIES.length, listings: LISTINGS.length, ads: ADS.length,
      users: USERS.length, reports: REPORTS.length, payments: PAYMENTS.length,
    };
  },
});
