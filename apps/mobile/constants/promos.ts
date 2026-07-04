import type { ImageSourcePropType } from 'react-native';

export interface Promo {
  id: string;
  title: string;
  /** Emoji fallback shown until an image is added. */
  emoji: string;
  gradient: [string, string];
}

/** "Tezroq toping" quick promo cards on the home feed. */
export const PROMOS: Promo[] = [
  { id: 'qurbonlik', title: 'Qurbonlik hayvonlari', emoji: '🐏', gradient: ['#0F5132', '#16A34A'] },
  { id: 'naslli', title: 'Naslli mollar', emoji: '🏅', gradient: ['#B45309', '#F59E0B'] },
  { id: 'arzon', title: 'Arzon narxlar', emoji: '💸', gradient: ['#1E40AF', '#3B82F6'] },
  { id: 'yaqin', title: 'Yaqin atrofda', emoji: '📍', gradient: ['#6D28D9', '#8B5CF6'] },
];

/**
 * Promo card artwork. Save each generated image (3:2 landscape) into
 * `assets/promos/` with the filename in the comment, then UNCOMMENT its line.
 * Cards without an entry fall back to the gradient + emoji above.
 */
export const PROMO_IMAGES: Record<string, ImageSourcePropType> = {
  qurbonlik: require('../assets/promos/qurbonlik.png'),
  naslli: require('../assets/promos/naslli.png'),
  arzon: require('../assets/promos/arzon.png'),
  yaqin: require('../assets/promos/yaqin.png'),
};
