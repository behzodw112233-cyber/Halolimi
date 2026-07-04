/** Category display names (matches the /sell grid). */
export const CATEGORY_LABELS: Record<string, string> = {
  cattle: 'Qoramol',
  sheep: 'Qoʻy va echkilar',
  horses: 'Otlar',
  poultry: 'Parrandalar',
  pets: 'Uy hayvonlari',
  rabbits: 'Quyonlar',
  fish: 'Baliqlar',
  supplies: 'Yem-xashak va anjomlar',
};

/** Popular breeds / types per category. */
export const BREEDS: Record<string, string[]> = {
  cattle: ['Golshteyn', 'Simmental', 'Shvits', 'Qora-ola', 'Angus', 'Jersey', 'Mahalliy zot'],
  sheep: ['Hisor', 'Qorakoʻl', 'Jaydari', 'Merinos', 'Edilboy', 'Mahalliy'],
  horses: ['Qorabayir', 'Oʻrta Osiyo', 'Arab', 'Yorgʻa', 'Toy zoti'],
  poultry: ['Broyler', 'Tuxum tovuq', 'Mahalliy tovuq', 'Kurka', 'Oʻrdak', 'Gʻoz'],
  pets: ['It', 'Mushuk', 'Toʻtiqush', 'Dekorativ', 'Boshqa'],
  rabbits: ['Kaliforniya', 'Serebro', 'Flandr', 'Mahalliy'],
  fish: ['Akvarium baliqlari', 'Tovus baliq', 'Guppi', 'Boshqa'],
  supplies: ['Yem-xashak', 'Anjomlar', 'Dori-darmon', 'Boshqa'],
};
