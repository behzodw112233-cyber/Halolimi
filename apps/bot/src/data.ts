// Static form picklists (config, not content). Content (categories, listings,
// ads) now comes from Convex — see src/convex.ts.

export const BREEDS: Record<string, string[]> = {
  cattle: ['Golshteyn', 'Simmental', 'Shvits', 'Angus', 'Mahalliy zot'],
  sheep: ['Hisor', 'Qorakoʻl', 'Jaydari', 'Merinos'],
  horses: ['Qorabayir', 'Oʻrta Osiyo', 'Arab'],
  poultry: ['Broyler', 'Tuxum tovuq', 'Kurka', 'Oʻrdak'],
  pets: ['It', 'Mushuk', 'Toʻtiqush'],
  rabbits: ['Kaliforniya', 'Serebro', 'Mahalliy'],
};

export const CITIES = [
  'Toshkent', 'Samarqand', "Fargʻona", 'Andijon', 'Buxoro',
  'Namangan', 'Qashqadaryo', 'Jizzax', 'Navoiy',
];
