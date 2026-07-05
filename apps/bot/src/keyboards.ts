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

export function categoriesKeyboard(categories: Category[], prefix: 'cat' | 'scat') {
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

export function listingKeyboard(index: number, total: number, saved: boolean) {
  const kb = new InlineKeyboard();
  kb.text(saved ? '💚 Saqlangan' : '❤️ Saqlash', 'save')
    .text('📞 Aloqa', 'contact')
    .row();
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

export function adsKeyboard(ads: Ad[]) {
  const kb = new InlineKeyboard();
  ads.forEach((a) => kb.url(`${a.emoji} ${a.cta} — ${a.advertiser}`, a.url).row());
  kb.text('🏠 Asosiy menyu', 'menu');
  return kb;
}

export function phoneRequestKeyboard() {
  return { keyboard: [[{ text: '📱 Raqamni yuborish', request_contact: true }]], resize_keyboard: true, one_time_keyboard: true };
}
