import { Bot, Context, InputFile, session, type SessionFlavor } from 'grammy';
import type { Id } from '@halolmia/backend/convex/_generated/dataModel';
import { fileURLToPath } from 'node:url';
import { BREEDS, CITIES } from './data.js';
import { api, categoryBySlug, convex, getCategories, type Listing } from './convex.js';
import {
  adsKeyboard,
  backToMenuKeyboard,
  breedsKeyboard,
  cabinetKeyboard,
  categoriesKeyboard,
  citiesKeyboard,
  filterCitiesKeyboard,
  languageKeyboard,
  listingKeyboard,
  locationRequestKeyboard,
  mainMenuKeyboard,
  pagedListKeyboard,
  phoneRequestKeyboard,
  photoStepKeyboard,
  previewKeyboard,
  searchFiltersKeyboard,
} from './keyboards.js';

interface SellDraft {
  step: 'category' | 'breed' | 'weight' | 'photos' | 'price' | 'city' | 'phone' | 'preview';
  category?: string;
  breed?: string;
  weight?: string;
  price?: string;
  city?: string;
  phone?: string;
  photoIds?: Id<'_storage'>[];
}

interface SessionData {
  lang: 'uz' | 'ru';
  saved: string[];
  browse: {
    category?: string;
    index: number;
    city?: string;
    priceMin?: number;
    priceMax?: number;
    hasPhotos?: boolean;
    verifiedOnly?: boolean;
    nearLat?: number;
    nearLng?: number;
  };
  sell?: SellDraft;
  awaiting?: 'price_filter';
  /** Pending app-login handshake token (set when opened via t.me/bot?start=<token>). */
  authToken?: string;
  /** Action to continue after the user shares their Telegram contact. */
  pendingAction?: 'save' | 'saved' | 'kabinet' | 'sell';
}

type MyContext = Context & SessionFlavor<SessionData>;

type BotListing = Listing & {
  photoUrls?: string[];
  distanceKm?: number | null;
  sellerTrust?: {
    verified?: boolean;
    isDealer?: boolean;
    rating?: number;
    ratingCount?: number;
    soldCount?: number;
  } | null;
};

const PAGE_SIZE = 5;

export function createBot(token: string) {
  const bot = new Bot<MyContext>(token);

  bot.use(
    session({
      initial: (): SessionData => ({ lang: 'uz', saved: [], browse: { index: 0 } }),
    })
  );

  // ---------- helpers ----------
  const listingsFor = (filters: SessionData['browse']) =>
    convex.query(api.listings.botSearch, {
      category: filters.category,
      city: filters.city,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      hasPhotos: filters.hasPhotos,
      verifiedOnly: filters.verifiedOnly,
      nearLat: filters.nearLat,
      nearLng: filters.nearLng,
      limit: 30,
    });

  const appBaseUrl = process.env.HALOLMIA_APP_URL || process.env.EXPO_PUBLIC_APP_URL;

  const appUrlFor = (path: string) =>
    appBaseUrl ? `${appBaseUrl.replace(/\/$/, '')}${path}` : `halolmia://${path.replace(/^\//, '')}`;

  const listingUrl = (id: string) => appUrlFor(`/listing/${id}`);

  const formatMoney = (raw: string) => {
    const trimmed = raw.trim();
    const digits = trimmed.replace(/[^\d]/g, '');
    if (!digits) return trimmed || '—';
    const suffix = /usd|\$|y\.?e/i.test(trimmed) ? ' y.e.' : " so'm";
    return `${Number(digits).toLocaleString('ru-RU')}${suffix}`;
  };

  const formatPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    const last = digits.slice(-9);
    return last.length === 9
      ? `+998 ${last.slice(0, 2)} ${last.slice(2, 5)} ${last.slice(5, 7)} ${last.slice(7)}`
      : raw.trim();
  };

  const trustLine = (l: BotListing) => {
    const t = l.sellerTrust;
    const bits = [
      t?.verified ? '🛡 Tasdiqlangan' : null,
      t?.isDealer ? '🏪 Rasmiy diler' : null,
      t?.ratingCount ? `⭐ ${t.rating?.toFixed(1)} (${t.ratingCount})` : null,
      t?.soldCount ? `✅ ${t.soldCount} sotilgan` : null,
    ].filter(Boolean);
    return bits.length ? `\n${bits.join(' · ')}` : '';
  };

  const telegramId = (ctx: MyContext) => (ctx.from?.id ? String(ctx.from.id) : null);

  async function linkedProfile(ctx: MyContext) {
    const id = telegramId(ctx);
    return id ? await convex.query(api.authTelegram.botProfile, { telegramId: id }) : null;
  }

  async function requestLink(ctx: MyContext, action: SessionData['pendingAction']) {
    ctx.session.pendingAction = action;
    await ctx.reply(
      '🔗 <b>Hisobni ulash</b>\n\n' +
        'Ilovadagi saqlanganlar, eʼlonlar va hisobingiz bilan sinxronlash uchun telefon raqamingizni ulashing 👇',
      { parse_mode: 'HTML', reply_markup: phoneRequestKeyboard() }
    );
  }

  async function currentListing(ctx: MyContext) {
    const { index } = ctx.session.browse;
    const list = await listingsFor(ctx.session.browse);
    return list[index] ?? null;
  }

  async function isSavedBy(userId: Id<'users'>, listingId: Id<'listings'>) {
    const ids = await convex.query(api.saved.ids, { userId });
    return ids.includes(listingId);
  }

  async function toggleCurrentSaved(ctx: MyContext, userId: Id<'users'>) {
    const l = await currentListing(ctx);
    if (!l) {
      await ctx.reply('Eʼlon topilmadi.', { reply_markup: backToMenuKeyboard() });
      return;
    }
    const saved = await convex.mutation(api.saved.toggle, { userId, listingId: l._id });
    await ctx.reply(saved ? '💚 Saqlandi' : 'Saqlanganlardan olib tashlandi');
  }

  async function startSell(ctx: MyContext) {
    ctx.session.sell = { step: 'category' };
    const cats = await getCategories();
    await ctx.reply('➕ <b>Nima sotyapsiz?</b>\n\nKategoriyani tanlang:', {
      parse_mode: 'HTML',
      reply_markup: categoriesKeyboard(cats, 'scat'),
    });
  }

  async function listingCaption(l: BotListing) {
    const cat = await categoryBySlug(l.category);
    const specs = l.specs.map((s) => `• ${s.label}: <b>${s.value}</b>`).join('\n');
    return (
      `${cat?.emoji ?? '🐾'} <b>${l.title}</b>\n\n` +
      `💰 <b>${l.price}</b>\n📍 ${l.city}\n\n` +
      `${specs}\n\n📝 ${l.desc || '—'}`
    );
  }

  async function enhancedListingCaption(l: BotListing) {
    const cat = await categoryBySlug(l.category);
    const specs = l.specs.map((s) => `• ${s.label}: <b>${s.value}</b>`).join('\n');
    return (
      `${cat?.emoji ?? '🐾'} <b>${l.title}</b>\n\n` +
      `💰 <b>${l.price}</b>\n📍 ${l.city}\n\n` +
      `${specs}${trustLine(l)}\n\n📝 ${l.desc || '—'}\n\n` +
      `📱 <code>halolmia://listing/${l._id}</code>`
    );
  }

  async function uploadTelegramPhoto(fileId: string) {
    const file = await bot.api.getFile(fileId);
    if (!file.file_path) return null;
    const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
    const source = await fetch(fileUrl);
    if (!source.ok) return null;
    const uploadUrl = await convex.mutation(api.files.generateUploadUrl, {});
    const uploaded = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg' },
      body: await source.arrayBuffer(),
    });
    if (!uploaded.ok) return null;
    const json = (await uploaded.json()) as { storageId?: string };
    return (json.storageId ?? null) as Id<'_storage'> | null;
  }

  async function showSellPreview(ctx: MyContext) {
    const d = ctx.session.sell;
    if (!d) return;
    const cat = await categoryBySlug(d.category ?? '');
    d.step = 'preview';
    const text =
      `👀 <b>Eʼlon preview</b>\n\n` +
      `${cat?.emoji ?? '🐾'} <b>${cat?.name ?? 'Hayvon'} · ${d.breed ?? '—'}</b>\n` +
      `⚖️ Vazn: <b>${d.weight ?? '—'} kg</b>\n` +
      `💰 Narx: <b>${d.price ?? '—'}</b>\n` +
      `📍 Manzil: <b>${d.city ?? '—'}</b>\n` +
      `📞 Telefon: <b>${d.phone ?? '—'}</b>\n` +
      `🖼 Rasmlar: <b>${d.photoIds?.length ?? 0} ta</b>\n\n` +
      `Hammasi joyidami bro?`;
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: previewKeyboard() });
  }

  const photoFor = (categorySlug: string) =>
    fileURLToPath(new URL(`../assets/${categorySlug}.jpg`, import.meta.url));

  async function renderListing(ctx: MyContext, mode: 'new' | 'edit') {
    const { index } = ctx.session.browse;
    const list = await listingsFor(ctx.session.browse);
    if (list.length === 0) {
      await ctx.reply('Bu kategoriyada hozircha eʼlon yoʻq.', { reply_markup: backToMenuKeyboard() });
      return;
    }
    const i = Math.max(0, Math.min(index, list.length - 1));
    ctx.session.browse.index = i;
    const l = list[i] as BotListing;
    const profile = await linkedProfile(ctx);
    const saved = profile ? await isSavedBy(profile.userId, l._id) : false;
    const kb = listingKeyboard(i, list.length, saved, listingUrl(l._id));
    const photo = l.photoUrls?.[0] ?? new InputFile(photoFor(l.category));
    const caption = await enhancedListingCaption(l);

    if (mode === 'edit') {
      try {
        await ctx.editMessageMedia(
          { type: 'photo', media: photo, caption, parse_mode: 'HTML' },
          { reply_markup: kb }
        );
        return;
      } catch {
        /* fall through */
      }
    }
    await ctx.replyWithPhoto(photo, { caption, parse_mode: 'HTML', reply_markup: kb });
  }

  async function renderFilters(ctx: MyContext) {
    const f = ctx.session.browse;
    const summary = [
      f.category ? `Kategoriya: ${f.category}` : null,
      f.city ? `Shahar: ${f.city}` : null,
      f.priceMin ? `Min: ${f.priceMin.toLocaleString('ru-RU')}` : null,
      f.priceMax ? `Max: ${f.priceMax.toLocaleString('ru-RU')}` : null,
      f.verifiedOnly ? 'Verified seller' : null,
      f.hasPhotos ? 'Rasmi bor' : null,
      f.nearLat !== undefined ? 'Yaqinimda' : null,
    ].filter(Boolean);
    await ctx.reply(
      `🔎 <b>Qidirish filterlari</b>\n\n${summary.length ? summary.join('\n') : 'Hozircha filter yo‘q.'}`,
      { parse_mode: 'HTML', reply_markup: searchFiltersKeyboard(f) }
    );
  }

  // ---------- start / language ----------
  bot.command('start', async (ctx) => {
    // Deep-link login: the app opened us with `?start=<handshake token>`.
    // `?start=verify` is for already-logged-in users who want the verified badge.
    const payload = ctx.match?.toString().trim();
    if (payload === 'verify' || payload === 'link') {
      await ctx.reply(
        '✅ <b>Sotuvchini tasdiqlash</b>\n\n' +
          'Telegram va telefon raqamingizni bogʻlang — eʼlonlaringizda ' +
          '«Tasdiqlangan sotuvchi» belgisi chiqadi.\n\n' +
          'Oʻzingizning raqamingizni ulashing 👇',
        { parse_mode: 'HTML', reply_markup: phoneRequestKeyboard() }
      );
      return;
    }
    if (payload) {
      ctx.session.authToken = payload;
      await ctx.reply(
        '🔐 <b>Halolmi ilovasiga kirish</b>\n\n' +
          'Tasdiqlash uchun o‘zingizning telefon raqamingizni ulashing 👇\n' +
          '<i>Telegram raqamingiz tasdiqlangan sotuvchi belgisini beradi.</i>',
        { parse_mode: 'HTML', reply_markup: phoneRequestKeyboard() }
      );
      return;
    }
    await ctx.reply(
      '👋 <b>Assalomu alaykum!</b>\n\nHalolmi — hayvonlar bozori botiga xush kelibsiz.\nTilni tanlang / Выберите язык:',
      { parse_mode: 'HTML', reply_markup: languageKeyboard() }
    );
  });

  bot.callbackQuery(/^lang_(uz|ru)$/, async (ctx) => {
    ctx.session.lang = ctx.match[1] as 'uz' | 'ru';
    await ctx.answerCallbackQuery();
    await ctx.editMessageText('🏠 <b>Asosiy menyu</b>\n\nQuyidagilardan birini tanlang:', {
      parse_mode: 'HTML',
      reply_markup: mainMenuKeyboard(),
    });
  });

  bot.callbackQuery('menu', async (ctx) => {
    ctx.session.sell = undefined;
    await ctx.answerCallbackQuery();
    await ctx.editMessageText('🏠 <b>Asosiy menyu</b>', {
      parse_mode: 'HTML',
      reply_markup: mainMenuKeyboard(),
    });
  });

  // ---------- browse ----------
  bot.callbackQuery('browse', async (ctx) => {
    await ctx.answerCallbackQuery();
    await renderFilters(ctx);
  });

  bot.callbackQuery('browse_legacy_unused', async (ctx) => {
    await ctx.answerCallbackQuery();
    const cats = await getCategories();
    const text = '🔍 <b>Kategoriyani tanlang:</b>';
    const opts = { parse_mode: 'HTML' as const, reply_markup: categoriesKeyboard(cats, 'cat') };
    try {
      await ctx.editMessageText(text, opts);
    } catch {
      try {
        await ctx.deleteMessage();
      } catch {
        /* ignore */
      }
      await ctx.reply(text, opts);
    }
  });

  bot.callbackQuery('filters', async (ctx) => {
    await ctx.answerCallbackQuery();
    await renderFilters(ctx);
  });

  bot.callbackQuery('filter_category', async (ctx) => {
    await ctx.answerCallbackQuery();
    const cats = await getCategories();
    await ctx.reply('🐾 <b>Kategoriyani tanlang:</b>', {
      parse_mode: 'HTML',
      reply_markup: categoriesKeyboard(cats, 'fcat'),
    });
  });

  bot.callbackQuery('filter_city', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply('📍 <b>Shaharni tanlang:</b>', {
      parse_mode: 'HTML',
      reply_markup: filterCitiesKeyboard(),
    });
  });

  bot.callbackQuery('filter_price', async (ctx) => {
    ctx.session.awaiting = 'price_filter';
    await ctx.answerCallbackQuery();
    await ctx.reply(
      '💰 <b>Narx filteri</b>\n\nFormat: <code>min max</code>\nMasalan: <code>3000000 8000000</code>\nFaqat max uchun: <code>0 5000000</code>',
      { parse_mode: 'HTML' }
    );
  });

  bot.callbackQuery('toggle_verified', async (ctx) => {
    ctx.session.browse.verifiedOnly = !ctx.session.browse.verifiedOnly;
    await ctx.answerCallbackQuery();
    await renderFilters(ctx);
  });

  bot.callbackQuery('toggle_photos', async (ctx) => {
    ctx.session.browse.hasPhotos = !ctx.session.browse.hasPhotos;
    await ctx.answerCallbackQuery();
    await renderFilters(ctx);
  });

  bot.callbackQuery('filter_near', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply('📌 Yaqin atrofdagi eʼlonlar uchun joylashuvingizni yuboring:', {
      reply_markup: locationRequestKeyboard(),
    });
  });

  bot.callbackQuery('clear_filters', async (ctx) => {
    ctx.session.browse = { index: 0 };
    ctx.session.awaiting = undefined;
    await ctx.answerCallbackQuery();
    await renderFilters(ctx);
  });

  bot.callbackQuery('clear_city', async (ctx) => {
    ctx.session.browse.city = undefined;
    await ctx.answerCallbackQuery();
    await renderFilters(ctx);
  });

  bot.callbackQuery('show_results', async (ctx) => {
    ctx.session.browse.index = 0;
    await ctx.answerCallbackQuery();
    await renderListing(ctx, 'new');
  });

  bot.callbackQuery(/^fcat_(.+)$/, async (ctx) => {
    ctx.session.browse.category = ctx.match[1];
    ctx.session.browse.index = 0;
    await ctx.answerCallbackQuery();
    await renderFilters(ctx);
  });

  bot.callbackQuery(/^fcity_(\d+)$/, async (ctx) => {
    ctx.session.browse.city = CITIES[Number(ctx.match[1])] ?? undefined;
    ctx.session.browse.index = 0;
    await ctx.answerCallbackQuery();
    await renderFilters(ctx);
  });

  bot.callbackQuery(/^cat_(.+)$/, async (ctx) => {
    ctx.session.browse = { category: ctx.match[1], index: 0 };
    await ctx.answerCallbackQuery();
    try {
      await ctx.deleteMessage();
    } catch {
      /* ignore */
    }
    await renderListing(ctx, 'new');
  });

  bot.callbackQuery('nav_next', async (ctx) => {
    ctx.session.browse.index += 1;
    await ctx.answerCallbackQuery();
    await renderListing(ctx, 'edit');
  });

  bot.callbackQuery('nav_prev', async (ctx) => {
    ctx.session.browse.index -= 1;
    await ctx.answerCallbackQuery();
    await renderListing(ctx, 'edit');
  });

  bot.callbackQuery('save', async (ctx) => {
    const profile = await linkedProfile(ctx);
    if (!profile) {
      await ctx.answerCallbackQuery({ text: 'Avval hisobni ulang' });
      await requestLink(ctx, 'save');
      return;
    }
    const { category, index } = ctx.session.browse;
    if (!category) return ctx.answerCallbackQuery();
    const list = await listingsFor(ctx.session.browse);
    const l = list[index];
    if (!l) return ctx.answerCallbackQuery();
    const saved = await convex.mutation(api.saved.toggle, {
      userId: profile.userId,
      listingId: l._id,
    });
    await ctx.answerCallbackQuery({ text: saved ? '❤️ Saqlandi' : 'Saqlanganlardan olib tashlandi' });
    await ctx.editMessageReplyMarkup({
      reply_markup: listingKeyboard(index, list.length, saved, listingUrl(l._id)),
    });
  });

  bot.callbackQuery('contact', async (ctx) => {
    const { category, index } = ctx.session.browse;
    if (!category) return ctx.answerCallbackQuery();
    const list = await listingsFor(ctx.session.browse);
    const l = list[index];
    await ctx.answerCallbackQuery({
      text: l ? `📞 Sotuvchi: ${l.phone}` : 'Topilmadi',
      show_alert: true,
    });
  });

  async function renderSavedPage(ctx: MyContext, page: number) {
    const profile = await linkedProfile(ctx);
    if (!profile) {
      await requestLink(ctx, 'saved');
      return;
    }
    const items = (await convex.query(api.saved.list, { userId: profile.userId })) as BotListing[];
    if (items.length === 0) {
      await ctx.reply('❤️ <b>Saqlangan eʼlonlar</b>\n\nHozircha bo‘sh. Eʼlonga ❤️ bosing.', {
        parse_mode: 'HTML',
        reply_markup: backToMenuKeyboard(),
      });
      return;
    }
    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    const safePage = Math.max(0, Math.min(page, totalPages - 1));
    const chunk = items.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
    const text =
      `❤️ <b>Saqlangan eʼlonlar</b> (${items.length} ta)\n\n` +
      chunk
        .map((l, i) => `${safePage * PAGE_SIZE + i + 1}. <b>${l.title}</b>\n   ${l.price} · ${l.city}\n   ${listingUrl(l._id)}`)
        .join('\n\n');
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: pagedListKeyboard('saved', safePage, totalPages) });
  }

  async function renderMyListingsPage(ctx: MyContext, page: number) {
    const profile = await linkedProfile(ctx);
    if (!profile) {
      await requestLink(ctx, 'kabinet');
      return;
    }
    const items = (await convex.query(api.listings.byOwner, { ownerId: profile.userId })) as BotListing[];
    if (items.length === 0) {
      await ctx.reply('📋 <b>Eʼlonlarim</b>\n\nHali eʼlon yo‘q. Sotish tugmasidan boshlang.', {
        parse_mode: 'HTML',
        reply_markup: backToMenuKeyboard(),
      });
      return;
    }
    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    const safePage = Math.max(0, Math.min(page, totalPages - 1));
    const chunk = items.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
    const statusLabel: Record<string, string> = {
      active: '✅ faol',
      pending: '⏳ tekshiruvda',
      rejected: '❌ rad etilgan',
      sold: '🤝 sotilgan',
    };
    const text =
      `📋 <b>Eʼlonlarim</b> (${items.length} ta)\n\n` +
      chunk
        .map((l, i) => `${safePage * PAGE_SIZE + i + 1}. <b>${l.title}</b>\n   ${statusLabel[l.status] ?? l.status} · ${l.price} · ${l.city}\n   ${listingUrl(l._id)}`)
        .join('\n\n');
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: pagedListKeyboard('mylistings', safePage, totalPages) });
  }

  bot.callbackQuery('saved', async (ctx) => {
    await ctx.answerCallbackQuery();
    await renderSavedPage(ctx, 0);
  });

  bot.callbackQuery(/^saved_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await renderSavedPage(ctx, Number(ctx.match[1]));
  });

  bot.callbackQuery(/^mylistings_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await renderMyListingsPage(ctx, Number(ctx.match[1]));
  });

  bot.callbackQuery('topup', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(`💳 Hisobni toʻldirish uchun ilovani oching:\n${appUrlFor('/profile')}`, {
      reply_markup: backToMenuKeyboard(),
    });
  });

  // ---------- saved ----------
  bot.callbackQuery('saved_legacy_unused', async (ctx) => {
    await ctx.answerCallbackQuery();
    const profile = await linkedProfile(ctx);
    if (!profile) {
      await requestLink(ctx, 'saved');
      return;
    }
    const realItems = await convex.query(api.saved.list, { userId: profile.userId });
    if (realItems.length === 0) {
      await ctx.editMessageText('❤️ <b>Saqlangan eʼlonlar</b>\n\nHozircha boʻsh. Eʼlonga ❤️ bosing.', {
        parse_mode: 'HTML',
        reply_markup: backToMenuKeyboard(),
      });
      return;
    }
    const realText =
      '❤️ <b>Saqlangan eʼlonlar</b>\n\n' +
      realItems.map((l) => `<b>${l.title}</b>\n   ${l.price} · ${l.city}`).join('\n\n');
    await ctx.editMessageText(realText, { parse_mode: 'HTML', reply_markup: backToMenuKeyboard() });
  });

  // ---------- kabinet ----------
  bot.callbackQuery('kabinet', async (ctx) => {
    await ctx.answerCallbackQuery();
    const profile = await linkedProfile(ctx);
    if (!profile) {
      await requestLink(ctx, 'kabinet');
      return;
    }
    await ctx.editMessageText(
      `👤 <b>Kabinet</b>\n\n` +
        `Salom, ${profile.name}!\n\n` +
        `❤️ Saqlangan: ${profile.savedCount} ta\n` +
        `📋 Eʼlonlaringiz: ${profile.listingCount} ta\n` +
        `⏳ Tekshiruvda: ${profile.pendingListingCount} ta\n` +
        `💰 Hisob: ${(profile.balance ?? 0).toLocaleString('ru-RU')} soʻm`,
      { parse_mode: 'HTML', reply_markup: cabinetKeyboard() }
    );
  });

  // ---------- sponsored ads ----------
  bot.callbackQuery('ads', async (ctx) => {
    await ctx.answerCallbackQuery();
    const ads = await convex.query(api.ads.byPlacement, { placement: 'bot' });
    const text =
      ads.length === 0
        ? '📢 <b>Aksiyalar</b>\n\nHozircha reklama yoʻq.'
        : '📢 <b>Aksiyalar va reklamalar</b>\n\n' +
          ads
            .map((a) => `${a.emoji} <b>${a.headline}</b>\n${a.body}\n<i>Homiy: ${a.advertiser}</i>`)
            .join('\n\n');
    const opts = { parse_mode: 'HTML' as const, reply_markup: adsKeyboard(ads) };
    try {
      await ctx.editMessageText(text, opts);
    } catch {
      try {
        await ctx.deleteMessage();
      } catch {
        /* ignore */
      }
      await ctx.reply(text, opts);
    }
  });

  // ---------- sell wizard ----------
  bot.callbackQuery('sell', async (ctx) => {
    ctx.session.sell = { step: 'category' };
    await ctx.answerCallbackQuery();
    const profile = await linkedProfile(ctx);
    if (!profile) {
      ctx.session.sell = undefined;
      await requestLink(ctx, 'sell');
      return;
    }
    const cats = await getCategories();
    await ctx.editMessageText('➕ <b>Nima sotyapsiz?</b>\n\nKategoriyani tanlang:', {
      parse_mode: 'HTML',
      reply_markup: categoriesKeyboard(cats, 'scat'),
    });
  });

  bot.callbackQuery(/^scat_(.+)$/, async (ctx) => {
    if (!ctx.session.sell) ctx.session.sell = { step: 'category' };
    ctx.session.sell.category = ctx.match[1];
    ctx.session.sell.step = 'breed';
    await ctx.answerCallbackQuery();
    await ctx.editMessageText('🐾 <b>Zotni tanlang:</b>', {
      parse_mode: 'HTML',
      reply_markup: breedsKeyboard(ctx.match[1]),
    });
  });

  bot.callbackQuery(/^sbreed_(\d+)$/, async (ctx) => {
    const draft = ctx.session.sell;
    if (!draft?.category) return ctx.answerCallbackQuery();
    draft.breed = BREEDS[draft.category]?.[Number(ctx.match[1])] ?? 'Boshqa';
    draft.step = 'weight';
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(`✅ Zot: <b>${draft.breed}</b>\n\n⚖️ <b>Vaznni kiriting (kg):</b>`, {
      parse_mode: 'HTML',
    });
  });

  bot.callbackQuery(/^scity_(\d+)$/, async (ctx) => {
    const draft = ctx.session.sell;
    if (!draft) return ctx.answerCallbackQuery();
    draft.city = CITIES[Number(ctx.match[1])] ?? 'Toshkent';
    draft.step = 'phone';
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(`✅ Manzil: <b>${draft.city}</b>`, { parse_mode: 'HTML' });
    await ctx.reply('📞 <b>Telefon raqamingizni yuboring:</b>', {
      parse_mode: 'HTML',
      reply_markup: phoneRequestKeyboard(),
    });
  });

  bot.callbackQuery('skip_photos', async (ctx) => {
    const draft = ctx.session.sell;
    if (!draft) return ctx.answerCallbackQuery();
    draft.step = 'price';
    await ctx.answerCallbackQuery();
    await ctx.reply('💰 <b>Narxni kiriting</b>\n\nMasalan: <code>12000000</code> yoki <code>500 usd</code>', {
      parse_mode: 'HTML',
    });
  });

  bot.callbackQuery('publish_listing', async (ctx) => {
    const draft = ctx.session.sell;
    if (!draft) return ctx.answerCallbackQuery();
    await ctx.answerCallbackQuery();
    await finishSell(ctx);
  });

  async function finishSell(ctx: MyContext) {
    const d = ctx.session.sell!;
    const cat = await categoryBySlug(d.category ?? '');
    const profile = await linkedProfile(ctx);
    if (!profile) {
      await requestLink(ctx, 'sell');
      return;
    }
    ctx.session.sell = undefined;
    const listingId = await convex.mutation(api.listings.create, {
      title: `${cat?.name ?? 'Hayvon'} · ${d.breed ?? ''}`.trim(),
      price: d.price ?? '—',
      category: d.category ?? 'cattle',
      city: d.city ?? 'Toshkent',
      phone: d.phone ?? profile.phone,
      specs: [
        { label: 'Vazni', value: `${d.weight ?? '—'} kg` },
        { label: 'Zot', value: d.breed ?? '—' },
      ],
      desc: '',
      sellerName: profile.name || ctx.from?.first_name || 'Sotuvchi',
      ownerId: profile.userId,
      photos: d.photoIds?.length ? d.photoIds : undefined,
    });
    await ctx.reply(
      `🎉 <b>Eʼlon qabul qilindi!</b>\n\n` +
        `${cat?.emoji ?? ''} ${cat?.name ?? ''} · ${d.breed}\n⚖️ ${d.weight} kg\n💰 ${d.price}\n📍 ${d.city}\n📞 ${d.phone}\n\n` +
        `⏳ Eʼlon <b>admin tekshiruvida</b> (10 daqiqagacha).`,
      { parse_mode: 'HTML', reply_markup: { remove_keyboard: true } }
    );
    await ctx.reply('🏠 Asosiy menyu', { reply_markup: mainMenuKeyboard() });
  }

  bot.on('message:location', async (ctx) => {
    const loc = ctx.message.location;
    ctx.session.browse.nearLat = loc.latitude;
    ctx.session.browse.nearLng = loc.longitude;
    ctx.session.browse.index = 0;
    await ctx.reply('✅ Joylashuv olindi. Endi yaqin atrofdagi eʼlonlarni ko‘rsataman.', {
      reply_markup: { remove_keyboard: true },
    });
    await renderListing(ctx, 'new');
  });

  bot.on('message:photo', async (ctx) => {
    const draft = ctx.session.sell;
    if (!draft || draft.step !== 'photos') {
      await ctx.reply('Rasm qabul qilindi, lekin hozir sotish flowida emasmiz. Sotish tugmasidan boshlang 🙂');
      return;
    }
    const photos = ctx.message.photo;
    const best = photos[photos.length - 1];
    if (!best) return;
    try {
      const storageId = await uploadTelegramPhoto(best.file_id);
      if (!storageId) throw new Error('upload failed');
      draft.photoIds = [...(draft.photoIds ?? []), storageId].slice(0, 5);
      const count = draft.photoIds.length;
      await ctx.reply(`✅ Rasm qo‘shildi (${count}/5).\n\nYana rasm yuboring yoki davom eting.`, {
        reply_markup: photoStepKeyboard(),
      });
      if (count >= 5) {
        draft.step = 'price';
        await ctx.reply('💰 <b>Narxni kiriting</b>\n\nMasalan: <code>12000000</code> yoki <code>500 usd</code>', {
          parse_mode: 'HTML',
        });
      }
    } catch {
      await ctx.reply('❌ Rasmni yuklay olmadim. Qayta urinib ko‘ring yoki rasmsiz davom eting.', {
        reply_markup: photoStepKeyboard(),
      });
    }
  });

  bot.on('message:contact', async (ctx) => {
    // Only accept the user's own Telegram contact — not someone else's shared card.
    const contact = ctx.message.contact;
    if (!ctx.from?.id || contact.user_id !== ctx.from.id) {
      await ctx.reply(
        '⚠️ Faqat o‘zingizning Telegram raqamingizni yuboring.\n' +
          'Pastdagi «📱 Raqamni yuborish» tugmasidan foydalaning.',
        { reply_markup: phoneRequestKeyboard() }
      );
      return;
    }

    // App-login handshake takes priority over the sell wizard.
    if (ctx.session.authToken) {
      const token = ctx.session.authToken;
      ctx.session.authToken = undefined;
      try {
        await convex.mutation(api.authTelegram.verify, {
          token,
          phone: contact.phone_number,
          name: ctx.from?.first_name,
          telegramId: telegramId(ctx) ?? undefined,
        });
        await ctx.reply(
          '✅ <b>Tayyor!</b>\n\n' +
            'Halolmi ilovasiga qayting — tizimga kirdingiz.\n' +
            'Siz endi <b>tasdiqlangan sotuvchi</b>siz 🛡️',
          { parse_mode: 'HTML', reply_markup: { remove_keyboard: true } }
        );
        await ctx.reply('🏠 Asosiy menyu', { reply_markup: mainMenuKeyboard() });
      } catch {
        await ctx.reply('❌ Kirishda xatolik. Ilovada qaytadan urinib koʻring.', {
          reply_markup: { remove_keyboard: true },
        });
      }
      return;
    }

    const tgId = telegramId(ctx);
    if (tgId) {
      const userId = await convex.mutation(api.authTelegram.linkBot, {
        telegramId: tgId,
        phone: contact.phone_number,
        name: ctx.from?.first_name,
      });
      const action = ctx.session.pendingAction;
      ctx.session.pendingAction = undefined;
      const draft = ctx.session.sell;

      await ctx.reply(
        '✅ Hisob ulandi.\n\n' +
          'Telegram + telefon mos keldi — siz <b>tasdiqlangan sotuvchi</b>siz 🛡️\n' +
          'Eʼlonlaringizda belgi koʻrinadi.',
        {
          parse_mode: 'HTML',
          reply_markup: { remove_keyboard: true },
        }
      );

      if (!action && draft?.step === 'phone') {
        draft.phone = formatPhone(contact.phone_number);
        await showSellPreview(ctx);
      } else if (action === 'save') {
        await toggleCurrentSaved(ctx, userId);
      } else if (action === 'sell') {
        await startSell(ctx);
      } else if (action === 'kabinet') {
        const profile = await convex.query(api.authTelegram.botProfile, { telegramId: tgId });
        await ctx.reply(
          profile
            ? `👤 <b>Kabinet</b>\n\nSalom, ${profile.name}!\n\n` +
                `${profile.verified ? '🛡️ Tasdiqlangan sotuvchi\n' : ''}` +
                `❤️ Saqlangan: ${profile.savedCount} ta\n` +
                `📋 Eʼlonlaringiz: ${profile.listingCount} ta\n` +
                `💰 Hisob: ${(profile.balance ?? 0).toLocaleString('ru-RU')} soʻm`
            : 'Kabinetni ochib boʻlmadi.',
          { parse_mode: 'HTML', reply_markup: cabinetKeyboard() }
        );
      } else if (action === 'saved') {
        await ctx.reply('❤️ Saqlangan eʼlonlarni ochish uchun menyudan “Saqlangan” ni bosing.', {
          reply_markup: mainMenuKeyboard(),
        });
      } else {
        await ctx.reply('🏠 Asosiy menyu', { reply_markup: mainMenuKeyboard() });
      }
      return;
    }

    const draft = ctx.session.sell;
    if (draft?.step === 'phone') {
      draft.phone = formatPhone(contact.phone_number);
      await showSellPreview(ctx);
    }
  });

  bot.on('message:text', async (ctx) => {
    if (ctx.session.awaiting === 'price_filter') {
      const nums = ctx.message.text
        .match(/\d+/g)
        ?.map((x) => Number(x))
        .filter((x) => Number.isFinite(x)) ?? [];
      const [minRaw, maxRaw] = nums;
      ctx.session.browse.priceMin = minRaw && minRaw > 0 ? minRaw : undefined;
      ctx.session.browse.priceMax = maxRaw && maxRaw > 0 ? maxRaw : undefined;
      ctx.session.browse.index = 0;
      ctx.session.awaiting = undefined;
      await ctx.reply('✅ Narx filteri saqlandi.', { reply_markup: { remove_keyboard: true } });
      await renderFilters(ctx);
      return;
    }
    const draft = ctx.session.sell;
    if (!draft) {
      await ctx.reply('Menyudan tanlang 👇', { reply_markup: mainMenuKeyboard() });
      return;
    }
    const text = ctx.message.text.trim();
    if (draft.step === 'photos') {
      await ctx.reply('Rasm yuboring yoki “Rasmsiz davom etish” tugmasini bosing 🙂', {
        reply_markup: photoStepKeyboard(),
      });
      return;
    }
    if (draft.step === 'preview') {
      await ctx.reply('Preview tayyor. Pastdagi tugmalardan birini tanlang 👇', {
        reply_markup: previewKeyboard(),
      });
      return;
    }
    if (draft.step === 'weight') {
      draft.weight = text.replace(/[^0-9]/g, '') || '—';
      draft.step = 'photos';
      draft.photoIds = [];
      await ctx.reply('🖼 <b>Rasm yuboring</b>\n\n1-5 ta foto tashlang. Tayyor bo‘lsa yoki rasmsiz davom etsangiz pastdagi tugmani bosing.', {
        parse_mode: 'HTML',
        reply_markup: photoStepKeyboard(),
      });
      return;
    } else if (draft.step === 'price') {
      draft.price = formatMoney(text);
      draft.step = 'city';
      await ctx.reply('📍 <b>Sotish manzilini tanlang:</b>', {
        parse_mode: 'HTML',
        reply_markup: citiesKeyboard(),
      });
    } else if (draft.step === 'phone') {
      draft.phone = formatPhone(text);
      await showSellPreview(ctx);
    }
  });

  bot.callbackQuery('noop', (ctx) => ctx.answerCallbackQuery());
  bot.catch((err) => console.error('Bot error:', err));

  return bot;
}
