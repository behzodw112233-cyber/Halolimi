import { Bot, Context, InputFile, session, type SessionFlavor } from 'grammy';
import { fileURLToPath } from 'node:url';
import { BREEDS, CITIES } from './data.js';
import { api, categoryBySlug, convex, getCategories, type Listing } from './convex.js';
import {
  adsKeyboard,
  backToMenuKeyboard,
  breedsKeyboard,
  categoriesKeyboard,
  citiesKeyboard,
  languageKeyboard,
  listingKeyboard,
  mainMenuKeyboard,
  phoneRequestKeyboard,
} from './keyboards.js';

interface SellDraft {
  step: 'category' | 'breed' | 'weight' | 'price' | 'city' | 'phone';
  category?: string;
  breed?: string;
  weight?: string;
  price?: string;
  city?: string;
  phone?: string;
}

interface SessionData {
  lang: 'uz' | 'ru';
  saved: string[];
  browse: { category?: string; index: number };
  sell?: SellDraft;
  /** Pending app-login handshake token (set when opened via t.me/bot?start=<token>). */
  authToken?: string;
}

type MyContext = Context & SessionFlavor<SessionData>;

export function createBot(token: string) {
  const bot = new Bot<MyContext>(token);

  bot.use(
    session({
      initial: (): SessionData => ({ lang: 'uz', saved: [], browse: { index: 0 } }),
    })
  );

  // ---------- helpers ----------
  const listingsFor = (category: string) =>
    convex.query(api.listings.listActive, { category });

  async function listingCaption(l: Listing) {
    const cat = await categoryBySlug(l.category);
    const specs = l.specs.map((s) => `• ${s.label}: <b>${s.value}</b>`).join('\n');
    return (
      `${cat?.emoji ?? '🐾'} <b>${l.title}</b>\n\n` +
      `💰 <b>${l.price}</b>\n📍 ${l.city}\n\n` +
      `${specs}\n\n📝 ${l.desc || '—'}`
    );
  }

  const photoFor = (categorySlug: string) =>
    fileURLToPath(new URL(`../assets/${categorySlug}.jpg`, import.meta.url));

  async function renderListing(ctx: MyContext, mode: 'new' | 'edit') {
    const { category, index } = ctx.session.browse;
    if (!category) return;
    const list = await listingsFor(category);
    if (list.length === 0) {
      await ctx.reply('Bu kategoriyada hozircha eʼlon yoʻq.', { reply_markup: backToMenuKeyboard() });
      return;
    }
    const i = Math.max(0, Math.min(index, list.length - 1));
    ctx.session.browse.index = i;
    const l = list[i];
    const kb = listingKeyboard(i, list.length, ctx.session.saved.includes(l._id));
    const photo = new InputFile(photoFor(l.category));
    const caption = await listingCaption(l);

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

  // ---------- start / language ----------
  bot.command('start', async (ctx) => {
    // Deep-link login: the app opened us with `?start=<handshake token>`.
    const payload = ctx.match?.toString().trim();
    if (payload) {
      ctx.session.authToken = payload;
      await ctx.reply(
        '🔐 <b>Halolmi ilovasiga kirish</b>\n\n' +
          'Tasdiqlash uchun telefon raqamingizni ulashing 👇\n' +
          '<i>Raqamingiz faqat hisobingizni yaratish uchun ishlatiladi.</i>',
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
    const { category, index } = ctx.session.browse;
    if (!category) return ctx.answerCallbackQuery();
    const list = await listingsFor(category);
    const l = list[index];
    if (!l) return ctx.answerCallbackQuery();
    const isSaved = ctx.session.saved.includes(l._id);
    ctx.session.saved = isSaved
      ? ctx.session.saved.filter((x) => x !== l._id)
      : [...ctx.session.saved, l._id];
    await ctx.answerCallbackQuery({ text: isSaved ? 'Saqlanganlardan olib tashlandi' : '❤️ Saqlandi' });
    await ctx.editMessageReplyMarkup({
      reply_markup: listingKeyboard(index, list.length, !isSaved),
    });
  });

  bot.callbackQuery('contact', async (ctx) => {
    const { category, index } = ctx.session.browse;
    if (!category) return ctx.answerCallbackQuery();
    const list = await listingsFor(category);
    const l = list[index];
    await ctx.answerCallbackQuery({
      text: l ? `📞 Sotuvchi: ${l.phone}` : 'Topilmadi',
      show_alert: true,
    });
  });

  // ---------- saved ----------
  bot.callbackQuery('saved', async (ctx) => {
    await ctx.answerCallbackQuery();
    const all = await convex.query(api.listings.list, {});
    const items = all.filter((l) => ctx.session.saved.includes(l._id));
    if (items.length === 0) {
      await ctx.editMessageText('❤️ <b>Saqlangan eʼlonlar</b>\n\nHozircha boʻsh. Eʼlonga ❤️ bosing.', {
        parse_mode: 'HTML',
        reply_markup: backToMenuKeyboard(),
      });
      return;
    }
    const text =
      '❤️ <b>Saqlangan eʼlonlar</b>\n\n' +
      items.map((l) => `<b>${l.title}</b>\n   ${l.price} · ${l.city}`).join('\n\n');
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: backToMenuKeyboard() });
  });

  // ---------- kabinet ----------
  bot.callbackQuery('kabinet', async (ctx) => {
    await ctx.answerCallbackQuery();
    const name = ctx.from?.first_name ?? 'Foydalanuvchi';
    await ctx.editMessageText(
      `👤 <b>Kabinet</b>\n\nSalom, ${name}!\n\n❤️ Saqlangan: ${ctx.session.saved.length} ta\n📋 Eʼlonlaringiz: 0 ta\n💰 Hisob: 0 soʻm`,
      { parse_mode: 'HTML', reply_markup: mainMenuKeyboard() }
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

  async function finishSell(ctx: MyContext) {
    const d = ctx.session.sell!;
    const cat = await categoryBySlug(d.category ?? '');
    ctx.session.sell = undefined;
    await convex.mutation(api.listings.create, {
      title: `${cat?.name ?? 'Hayvon'} · ${d.breed ?? ''}`.trim(),
      price: d.price ?? '—',
      category: d.category ?? 'cattle',
      city: d.city ?? 'Toshkent',
      phone: d.phone ?? '',
      specs: [
        { label: 'Vazni', value: `${d.weight ?? '—'} kg` },
        { label: 'Zot', value: d.breed ?? '—' },
      ],
      desc: '',
      sellerName: ctx.from?.first_name ?? 'Sotuvchi',
    });
    await ctx.reply(
      `🎉 <b>Eʼlon qabul qilindi!</b>\n\n` +
        `${cat?.emoji ?? ''} ${cat?.name ?? ''} · ${d.breed}\n⚖️ ${d.weight} kg\n💰 ${d.price}\n📍 ${d.city}\n📞 ${d.phone}\n\n` +
        `⏳ Eʼlon <b>admin tekshiruvida</b> (10 daqiqagacha).`,
      { parse_mode: 'HTML', reply_markup: { remove_keyboard: true } }
    );
    await ctx.reply('🏠 Asosiy menyu', { reply_markup: mainMenuKeyboard() });
  }

  bot.on('message:contact', async (ctx) => {
    // App-login handshake takes priority over the sell wizard.
    if (ctx.session.authToken) {
      const token = ctx.session.authToken;
      ctx.session.authToken = undefined;
      try {
        await convex.mutation(api.authTelegram.verify, {
          token,
          phone: ctx.message.contact.phone_number,
          name: ctx.from?.first_name,
        });
        await ctx.reply(
          '✅ <b>Tayyor!</b>\n\nHalolmi ilovasiga qayting — siz avtomatik tarzda tizimga kirdingiz.',
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

    const draft = ctx.session.sell;
    if (draft?.step === 'phone') {
      draft.phone = ctx.message.contact.phone_number;
      await finishSell(ctx);
    }
  });

  bot.on('message:text', async (ctx) => {
    const draft = ctx.session.sell;
    if (!draft) {
      await ctx.reply('Menyudan tanlang 👇', { reply_markup: mainMenuKeyboard() });
      return;
    }
    const text = ctx.message.text.trim();
    if (draft.step === 'weight') {
      draft.weight = text.replace(/[^0-9]/g, '') || '—';
      draft.step = 'price';
      await ctx.reply('💰 <b>Narxni kiriting (soʻm):</b>', { parse_mode: 'HTML' });
    } else if (draft.step === 'price') {
      draft.price = text;
      draft.step = 'city';
      await ctx.reply('📍 <b>Sotish manzilini tanlang:</b>', {
        parse_mode: 'HTML',
        reply_markup: citiesKeyboard(),
      });
    } else if (draft.step === 'phone') {
      draft.phone = text;
      await finishSell(ctx);
    }
  });

  bot.callbackQuery('noop', (ctx) => ctx.answerCallbackQuery());
  bot.catch((err) => console.error('Bot error:', err));

  return bot;
}
