import { v } from 'convex/values';
import { mutation, type MutationCtx } from './_generated/server';

// Real structural data only. NO fake listings / ads / users / reports / payments —
// those are created by real users through the app, bot, and admin panel.

const CATEGORIES = [
  { slug: 'cattle', name: 'Qoramol', emoji: '🐄', order: 0 },
  { slug: 'sheep', name: 'Qoʻy va echkilar', emoji: '🐑', order: 1 },
  { slug: 'horses', name: 'Otlar', emoji: '🐎', order: 2 },
  { slug: 'poultry', name: 'Parrandalar', emoji: '🐔', order: 3 },
  { slug: 'pets', name: 'Uy hayvonlari', emoji: '🐕', order: 4 },
  { slug: 'rabbits', name: 'Quyonlar', emoji: '🐇', order: 5 },
];

// Welcome announcements — real product content shown to every user.
const NOTIFICATIONS = [
  { icon: 'sparkles', title: 'Halolmiga xush kelibsiz! 🎉', body: 'Hayvonlaringizni oson va tez soting — birinchi eʼloningizni joylang.' },
  { icon: 'megaphone-outline', title: 'Bepul eʼlon joylash', body: 'Hozir eʼlon joylashtirish mutlaqo bepul. Imkoniyatdan foydalaning!' },
  { icon: 'bulb-outline', title: 'Maslahat', body: 'Sifatli rasmlar qoʻshsangiz, hayvoningiz tezroq sotiladi.' },
];

const ALL_TABLES = [
  'categories', 'listings', 'ads', 'users', 'reports',
  'payments', 'notifications', 'messages', 'saved',
] as const;

const DEMO_CATEGORIES = [
  { slug: 'cattle', name: 'Qoramol', emoji: '🐄', order: 0 },
  { slug: 'sheep', name: 'Qoʻy va echkilar', emoji: '🐑', order: 1 },
  { slug: 'horses', name: 'Otlar', emoji: '🐎', order: 2 },
  { slug: 'poultry', name: 'Parrandalar', emoji: '🐔', order: 3 },
  { slug: 'pets', name: 'Uy hayvonlari', emoji: '🐕', order: 4 },
  { slug: 'rabbits', name: 'Quyonlar', emoji: '🐇', order: 5 },
  { slug: 'fish', name: 'Baliqlar', emoji: '🐟', order: 6 },
  { slug: 'supplies', name: 'Yem-xashak va anjomlar', emoji: '🌾', order: 7 },
] as const;

const DEMO_BREEDS: Record<string, string[]> = {
  cattle: ['Golshteyn', 'Simmental', 'Shvits', 'Qora-ola', 'Angus', 'Jersey', 'Bushuyev', 'Bestuzhev', 'Mahalliy zot'],
  sheep: ['Hisor', 'Qorakoʻl', 'Jaydari', 'Merinos', 'Edilboy', 'Mahalliy'],
  horses: ['Qorabayir', 'Oʻrta Osiyo', 'Arab', 'Yorgʻa', 'Toy zoti'],
  poultry: ['Broyler', 'Tuxum tovuq', 'Mahalliy tovuq', 'Kurka', 'Oʻrdak', 'Gʻoz'],
  pets: ['It', 'Mushuk', 'Toʻtiqush', 'Dekorativ', 'Boshqa'],
  rabbits: ['Kaliforniya', 'Serebro', 'Flandr', 'Mahalliy'],
  fish: ['Akvarium baliqlari', 'Tovus baliq', 'Guppi', 'Boshqa'],
  supplies: ['Yem-xashak', 'Anjomlar', 'Dori-darmon', 'Boshqa'],
};

const REGIONS = [
  { name: 'Toshkent viloyati', city: 'Toshkent', lat: 41.0, lng: 69.5, districts: ['Qibray', 'Parkent', 'Chinoz', 'Yangiyoʻl'] },
  { name: 'Andijon', city: 'Andijon', lat: 40.783, lng: 72.35, districts: ['Asaka', 'Shahrixon', 'Marhamat', 'Paxtaobod'] },
  { name: 'Fargʻona', city: 'Fargʻona', lat: 40.386, lng: 71.787, districts: ['Quva', 'Rishton', 'Qoʻqon', 'Oltiariq'] },
  { name: 'Namangan', city: 'Namangan', lat: 40.998, lng: 71.672, districts: ['Chust', 'Pop', 'Uychi', 'Kosonsoy'] },
  { name: 'Samarqand', city: 'Samarqand', lat: 39.654, lng: 66.975, districts: ['Urgut', 'Payariq', 'Pastdargʻom', 'Kattaqoʻrgʻon'] },
  { name: 'Buxoro', city: 'Buxoro', lat: 39.767, lng: 64.421, districts: ['Gʻijduvon', 'Qorakoʻl', 'Romitan', 'Vobkent'] },
  { name: 'Xorazm', city: 'Urganch', lat: 41.35, lng: 60.633, districts: ['Xiva', 'Hazorasp', 'Gurlan', 'Shovot'] },
  { name: 'Qashqadaryo', city: 'Qarshi', lat: 38.86, lng: 65.79, districts: ['Kitob', 'Koson', 'Shahrisabz', 'Yakkabogʻ'] },
  { name: 'Surxondaryo', city: 'Termiz', lat: 37.94, lng: 67.57, districts: ['Denov', 'Sherobod', 'Boysun', 'Jarqoʻrgʻon'] },
  { name: 'Jizzax', city: 'Jizzax', lat: 40.115, lng: 67.842, districts: ['Zomin', 'Forish', 'Gʻallaorol', 'Baxmal'] },
  { name: 'Navoiy', city: 'Navoiy', lat: 40.104, lng: 65.373, districts: ['Karmana', 'Nurota', 'Qiziltepa', 'Xatirchi'] },
  { name: 'Qoraqalpogʻiston', city: 'Nukus', lat: 42.46, lng: 59.61, districts: ['Beruniy', 'Toʻrtkoʻl', 'Qoʻngʻirot', 'Xoʻjayli'] },
] as const;

const FIRST_NAMES = ['Aziz', 'Behzod', 'Jasur', 'Dilshod', 'Sardor', 'Abror', 'Akmal', 'Sherzod', 'Zafar', 'Otabek', 'Madina', 'Gulnoza', 'Sevara', 'Malika', 'Nilufar'];
const LAST_HINTS = ['fermer', 'dehqon', 'chorvador', 'oilaviy xoʻjalik', 'bozorchi'];

function rnd(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function pick<T>(random: () => number, items: readonly T[]) {
  return items[Math.floor(random() * items.length)];
}

function priceFor(random: () => number, category: string) {
  const ranges: Record<string, [number, number]> = {
    cattle: [4_500_000, 28_000_000],
    sheep: [900_000, 6_500_000],
    horses: [9_000_000, 65_000_000],
    poultry: [45_000, 650_000],
    pets: [250_000, 4_500_000],
    rabbits: [80_000, 700_000],
    fish: [20_000, 350_000],
    supplies: [40_000, 3_500_000],
  };
  const [min, max] = ranges[category] ?? [100_000, 5_000_000];
  const raw = min + random() * (max - min);
  const step = raw > 2_000_000 ? 100_000 : raw > 300_000 ? 25_000 : 5_000;
  return Math.round(raw / step) * step;
}

function weightFor(random: () => number, category: string) {
  const ranges: Record<string, [number, number]> = {
    cattle: [80, 620],
    sheep: [18, 95],
    horses: [180, 520],
    poultry: [1, 18],
    rabbits: [1, 7],
  };
  const range = ranges[category];
  if (!range) return null;
  const [min, max] = range;
  return Math.round(min + random() * (max - min));
}

async function ensureDemoCategories(ctx: MutationCtx) {
  for (const c of DEMO_CATEGORIES) {
    const existing = await ctx.db
      .query('categories')
      .withIndex('by_slug', (q) => q.eq('slug', c.slug))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { name: c.name, emoji: c.emoji, order: c.order, active: true, breeds: DEMO_BREEDS[c.slug] });
    } else {
      await ctx.db.insert('categories', { ...c, active: true, breeds: DEMO_BREEDS[c.slug] });
    }
  }
}

async function ensureDemoUsers(ctx: MutationCtx, count: number) {
  const users = await ctx.db.query('users').collect();
  const demoUsers = users.filter((u) => u.phone.startsWith('+99890000'));
  if (demoUsers.length >= count) return demoUsers.slice(0, count);
  const random = rnd(912_2026);
  for (let i = demoUsers.length; i < count; i++) {
    const name = `${pick(random, FIRST_NAMES)} ${pick(random, LAST_HINTS)}`;
    const id = await ctx.db.insert('users', {
      name,
      phone: `+99890000${String(i).padStart(4, '0')}`,
      telegramId: `demo_${i}`,
      listings: 0,
      joined: new Date(Date.now() - Math.floor(random() * 320) * 86400000).toLocaleDateString('ru-RU'),
      status: 'active',
      bio: 'Demo sotuvchi: maʼlumotlar test marketplace uchun yaratilgan.',
      ratingSum: 16 + Math.floor(random() * 9),
      ratingCount: 4 + Math.floor(random() * 3),
      soldCount: Math.floor(random() * 18),
      lastSeen: Date.now() - Math.floor(random() * 2 * 86400000),
      balance: Math.floor(random() * 2_000_000),
      isDealer: random() > 0.86,
    });
    demoUsers.push((await ctx.db.get(id))!);
  }
  return demoUsers;
}

async function clearAll(ctx: MutationCtx) {
  for (const table of ALL_TABLES) {
    const rows = await ctx.db.query(table).collect();
    await Promise.all(rows.map((r) => ctx.db.delete(r._id)));
  }
}

async function insertDemoAnimals(
  ctx: MutationCtx,
  { count, offset, clearDemo }: { count: number; offset: number; clearDemo: boolean }
) {
  await ensureDemoCategories(ctx);
  if (clearDemo) {
    const listings = await ctx.db.query('listings').collect();
    await Promise.all(
      listings
        .filter((l) => l.phone.startsWith('+99890000') || l.desc.includes('Demo'))
        .map((l) => ctx.db.delete(l._id))
    );
  }

  const users = await ensureDemoUsers(ctx, 90);
  const random = rnd(77_000 + offset);
  const now = Date.now();
  let inserted = 0;

  for (let i = 0; i < count; i++) {
    const n = offset + i;
    const category = pick(random, [
      'cattle', 'cattle', 'cattle',
      'sheep', 'sheep', 'sheep',
      'poultry', 'poultry',
      'horses',
      'rabbits',
      'pets',
      'fish',
      'supplies',
    ]);
    const breed = pick(random, DEMO_BREEDS[category]);
    const region = pick(random, REGIONS);
    const district = pick(random, region.districts);
    const seller = pick(random, users);
    const price = priceFor(random, category);
    const weight = weightFor(random, category);
    const ageMonths = category === 'supplies' ? null : Math.max(1, Math.round(2 + random() * 46));
    const lat = region.lat + (random() - 0.5) * 0.42;
    const lng = region.lng + (random() - 0.5) * 0.42;
    const qty =
      category === 'poultry' || category === 'fish' || category === 'supplies'
        ? 1 + Math.floor(random() * 45)
        : 1 + Math.floor(random() * 4);
    const specs = [
      { label: 'Zot', value: breed },
      ...(weight ? [{ label: 'Vazni', value: `${weight} kg` }] : []),
      ...(ageMonths ? [{ label: 'Yoshi', value: ageMonths >= 12 ? `${Math.round(ageMonths / 12)} yosh` : `${ageMonths} oy` }] : []),
      { label: 'Soni', value: `${qty} ta` },
    ];
    const titles: Record<string, string> = {
      cattle: `${breed} buzoq / qoramol`,
      sheep: `${breed} qo'y-echki`,
      horses: `${breed} ot`,
      poultry: `${breed} parrandalar`,
      pets: `${breed} uy hayvoni`,
      rabbits: `${breed} quyon`,
      fish: `${breed}`,
      supplies: `${breed} sotiladi`,
    };
    const createdAt = now - Math.floor(random() * 45 * 86400000);
    await ctx.db.insert('listings', {
      title: `${titles[category]} #${n + 1}`,
      price: `${price.toLocaleString('ru-RU')} so'm`,
      category,
      city: region.city,
      phone: seller.phone,
      specs,
      desc:
        `Demo e'lon. ${region.name}, ${district}. ` +
        "Sog'ligi tekshirilgan, kelishilgan joyda ko'rish mumkin. " +
        "AI qidiruv va home feed testlari uchun web-kontekstga mos sintetik ma'lumot.",
      status: 'active',
      sellerName: seller.name,
      ownerId: seller._id,
      region: region.name,
      district,
      lat,
      lng,
      views: Math.floor(random() * 380),
      createdAt,
      tier: random() > 0.82 ? pick(random, ['alo', 'zor', 'vip', 'lux'] as const) : undefined,
      boostedUntil: random() > 0.82 ? now + Math.floor(random() * 16 * 86400000) : undefined,
      pinned: random() > 0.985,
      feedBoost: random() > 0.93 ? Math.floor(random() * 8) : undefined,
    });
    inserted++;
  }

  return { inserted, offset, users: users.length };
}

/**
 * Set up the deployment with only the real category taxonomy + welcome
 * notifications. Clears every table first, so re-running wipes any leftover
 * data. Produces a clean, empty marketplace ready for real users.
 */
export const run = mutation({
  args: {
    demoCount: v.optional(v.number()),
    demoOffset: v.optional(v.number()),
    clearDemo: v.optional(v.boolean()),
  },
  handler: async (ctx, { demoCount, demoOffset = 0, clearDemo = false }) => {
    if (demoCount !== undefined) {
      return await insertDemoAnimals(ctx, {
        count: demoCount,
        offset: demoOffset,
        clearDemo,
      });
    }
    await clearAll(ctx);
    for (const c of CATEGORIES) await ctx.db.insert('categories', { ...c, active: true });
    let n = Date.now();
    for (const notif of NOTIFICATIONS) await ctx.db.insert('notifications', { ...notif, createdAt: n-- });
    return { categories: CATEGORIES.length, notifications: NOTIFICATIONS.length };
  },
});

/** Wipe EVERYTHING, including categories. Leaves a completely empty database. */
export const reset = mutation({
  args: {},
  handler: async (ctx) => {
    await clearAll(ctx);
    return { cleared: true };
  },
});

export const demoAnimals = mutation({
  args: {
    count: v.optional(v.number()),
    offset: v.optional(v.number()),
    clearDemo: v.optional(v.boolean()),
  },
  handler: async (ctx, { count = 100, offset = 0, clearDemo = false }) => {
    await ensureDemoCategories(ctx);
    if (clearDemo) {
      const listings = await ctx.db.query('listings').collect();
      await Promise.all(
        listings
          .filter((l) => l.phone.startsWith('+99890000') || l.desc.includes('Demo eʼlon'))
          .map((l) => ctx.db.delete(l._id))
      );
    }

    const users = await ensureDemoUsers(ctx, 90);
    const random = rnd(77_000 + offset);
    const now = Date.now();
    let inserted = 0;

    for (let i = 0; i < count; i++) {
      const n = offset + i;
      const category = pick(random, [
        'cattle', 'cattle', 'cattle',
        'sheep', 'sheep', 'sheep',
        'poultry', 'poultry',
        'horses',
        'rabbits',
        'pets',
        'fish',
        'supplies',
      ]);
      const breed = pick(random, DEMO_BREEDS[category]);
      const region = pick(random, REGIONS);
      const district = pick(random, region.districts);
      const seller = pick(random, users);
      const price = priceFor(random, category);
      const weight = weightFor(random, category);
      const ageMonths = category === 'supplies' ? null : Math.max(1, Math.round(2 + random() * 46));
      const lat = region.lat + (random() - 0.5) * 0.42;
      const lng = region.lng + (random() - 0.5) * 0.42;
      const qty =
        category === 'poultry' || category === 'fish' || category === 'supplies'
          ? 1 + Math.floor(random() * 45)
          : 1 + Math.floor(random() * 4);
      const specs = [
        { label: 'Zot', value: breed },
        ...(weight ? [{ label: 'Vazni', value: `${weight} kg` }] : []),
        ...(ageMonths ? [{ label: 'Yoshi', value: ageMonths >= 12 ? `${Math.round(ageMonths / 12)} yosh` : `${ageMonths} oy` }] : []),
        { label: 'Soni', value: `${qty} ta` },
      ];
      const titles: Record<string, string> = {
        cattle: `${breed} buzoq / qoramol`,
        sheep: `${breed} qoʻy-echki`,
        horses: `${breed} ot`,
        poultry: `${breed} parrandalar`,
        pets: `${breed} uy hayvoni`,
        rabbits: `${breed} quyon`,
        fish: `${breed}`,
        supplies: `${breed} sotiladi`,
      };
      const createdAt = now - Math.floor(random() * 45 * 86400000);
      await ctx.db.insert('listings', {
        title: `${titles[category]} #${n + 1}`,
        price: `${price.toLocaleString('ru-RU')} soʻm`,
        category,
        city: region.city,
        phone: seller.phone,
        specs,
        desc:
          `Demo eʼlon. ${region.name}, ${district}. ` +
          `Sogʻligi tekshirilgan, kelishilgan joyda ko'rish mumkin. ` +
          `AI qidiruv va home feed testlari uchun web-kontekstga mos sintetik maʼlumot.`,
        status: 'active',
        sellerName: seller.name,
        ownerId: seller._id,
        region: region.name,
        district,
        lat,
        lng,
        views: Math.floor(random() * 380),
        createdAt,
        tier: random() > 0.82 ? pick(random, ['alo', 'zor', 'vip', 'lux'] as const) : undefined,
        boostedUntil: random() > 0.82 ? now + Math.floor(random() * 16 * 86400000) : undefined,
        pinned: random() > 0.985,
        feedBoost: random() > 0.93 ? Math.floor(random() * 8) : undefined,
      });
      inserted++;
    }

    return { inserted, offset, users: users.length };
  },
});
