import type { ImageSourcePropType } from 'react-native';

/**
 * Category artwork. Save each generated PNG into `assets/categories/` using the
 * filename shown in the comment, then UNCOMMENT its line below. Any category
 * without an entry here falls back to its emoji placeholder on the card.
 *
 * Metro requires static `require()` paths, so each image must be listed explicitly.
 */
export const CATEGORY_IMAGES: Record<string, ImageSourcePropType> = {
  cattle: require('../assets/categories/cattle.png'), // 🐄 cow
  sheep: require('../assets/categories/sheep.png'), // 🐑 sheep + goat
  horses: require('../assets/categories/horses.png'), // 🐎 horse
  poultry: require('../assets/categories/poultry.png'), // 🐔 hen + rooster
  pets: require('../assets/categories/pets.png'), // 🐕 dog + cat
  rabbits: require('../assets/categories/rabbits.png'), // 🐇 rabbit
  fish: require('../assets/categories/fish.png'), // 🐟 fish
  supplies: require('../assets/categories/supplies.png'), // 🌾 feed + supplies
};
