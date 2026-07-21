import { InlineKeyboard } from 'grammy';
import { BREEDS, CITIES } from './data.js';
import type { Ad, Category } from './convex.js';

export function languageKeyboard() {
  return new InlineKeyboard()
    .text("🇺🇿 O'zbek tili", 'lang_uz')
    .text('🇷🇺 Русский', 'lang_ru');
}

export function mainMenuKeyboard() {
  return new InlineKeyboard()
    .text('🔍 Qidirish', 'browse')
    .text('➕ Sotish', 'sell')
    .row()
    .text('❤️ Saqlangan', 'saved')
    .text('👤 Kabinet', 'kabinet')
    .row()
    .text('📢 Aksiyalar', 'ads');
}

export function categoriesKeyboard(categories: Category[], prefix: 'cat' | 'scat' | 'fcat') {
  const kb = new InlineKeyboard();
  categories.forEach((c, i) => {
    kb.text(`${c.emoji} ${c.name}`, `${prefix}_${c.slug}`);
    if (i % 2 === 1) kb.row();
  });
  kb.row().text('🔙 Orqaga', 'menu');
  return kb;
}

export function breedsKeyboard(categorySlug: string) {
  const kb = new InlineKeyboard();
  const breeds = BREEDS[categorySlug] ?? [];
  breeds.forEach((b, i) => {
    kb.text(b, `sbreed_${i}`);
    if (i % 2 === 1) kb.row();
  });
  return kb;
}

export function citiesKeyboard() {
  const kb = new InlineKeyboard();
  CITIES.forEach((c, i) => {
    kb.text(c, `scity_${i}`);
    if (i % 2 === 1) kb.row();
  });
  return kb;
}

export function listingKeyboard(index: number, total: number, saved: boolean, openUrl?: string) {
  const kb = new InlineKeyboard();
  kb.text(saved ? '💚 Saqlangan' : '❤️ Saqlash', 'save')
    .text('📞 Aloqa', 'contact')
    .row();
  if (openUrl) kb.url('📱 Ilovada ochish', openUrl).row();
  const nav = new InlineKeyboard();
  if (index > 0) nav.text('◀️', 'nav_prev');
  nav.text(`${index + 1}/${total}`, 'noop');
  if (index < total - 1) nav.text('▶️', 'nav_next');
  kb.append(nav);
  kb.row().text('🔙 Kategoriyalar', 'browse');
  return kb;
}

export function backToMenuKeyboard() {
  return new InlineKeyboard().text('🏠 Asosiy menyu', 'menu');
}

export function pagedListKeyboard(kind: 'saved' | 'mylistings', page: number, totalPages: number) {
  const kb = new InlineKeyboard();
  if (page > 0) kb.text('◀️ Oldingi', `${kind}_${page - 1}`);
  kb.text(`${page + 1}/${Math.max(totalPages, 1)}`, 'noop');
  if (page < totalPages - 1) kb.text('Keyingi ▶️', `${kind}_${page + 1}`);
  kb.row().text('🏠 Asosiy menyu', 'menu');
  return kb;
}

export function filterCitiesKeyboard() {
  const kb = new InlineKeyboard();
  CITIES.forEach((c, i) => {
    kb.text(c, `fcity_${i}`);
    if (i % 2 === 1) kb.row();
  });
  kb.row().text('🧹 Shaharni tozalash', 'clear_city');
  kb.row().text('🔎 Filterlarga qaytish', 'filters');
  return kb;
}

export function searchFiltersKeyboard(filters: {
  category?: string;
  city?: string;
  priceMin?: number;
  priceMax?: number;
  hasPhotos?: boolean;
  verifiedOnly?: boolean;
  nearLat?: number;
}) {
  const kb = new InlineKeyboard();
  kb.text(filters.category ? '✅ Kategoriya' : '🐾 Kategoriya', 'filter_category')
    .text(filters.city ? `✅ ${filters.city}` : '📍 Shahar', 'filter_city')
    .row();
  kb.text(filters.priceMin || filters.priceMax ? '✅ Narx' : '💰 Narx', 'filter_price')
    .text(filters.verifiedOnly ? '🛡 Verified ✅' : '🛡 Verified', 'toggle_verified')
    .row();
  kb.text(filters.hasPhotos ? '🖼 Rasmi bor ✅' : '🖼 Rasmi bor', 'toggle_photos')
    .text(filters.nearLat !== undefined ? '📌 Yaqinimda ✅' : '📌 Yaqinimda', 'filter_near')
    .row();
  kb.text('🔎 Natijalarni ko‘rish', 'show_results')
    .text('🧹 Tozalash', 'clear_filters')
    .row()
    .text('🏠 Asosiy menyu', 'menu');
  return kb;
}

export function locationRequestKeyboard() {
  return {
    keyboard: [[{ text: '📍 Joylashuvni yuborish', request_location: true }]],
    resize_keyboard: true,
    one_time_keyboard: true,
  };
}

export function cabinetKeyboard() {
  return new InlineKeyboard()
    .text('📋 Eʼlonlarim', 'mylistings_0')
    .text('💳 Hisobni toʻldirish', 'topup')
    .row()
    .text('🏠 Asosiy menyu', 'menu');
}

export function photoStepKeyboard() {
  return new InlineKeyboard()
    .text('Rasmsiz davom etish ➡️', 'skip_photos')
    .row()
    .text('🏠 Bekor qilish', 'menu');
}

export function previewKeyboard() {
  return new InlineKeyboard()
    .text('✅ Eʼlonni yuborish', 'publish_listing')
    .row()
    .text('✏️ Qaytadan boshlash', 'sell')
    .text('🏠 Bekor qilish', 'menu');
}

export function adsKeyboard(ads: Ad[]) {
  const kb = new InlineKeyboard();
  ads.forEach((a) => kb.url(`${a.emoji} ${a.cta} — ${a.advertiser}`, a.url).row());
  kb.text('🏠 Asosiy menyu', 'menu');
  return kb;
}

export function phoneRequestKeyboard() {
  return { keyboard: [[{ text: '📱 Raqamni yuborish', request_contact: true }]], resize_keyboard: true, one_time_keyboard: true };
}
