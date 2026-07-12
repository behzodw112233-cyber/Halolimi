/**
 * Uzbekistan administrative divisions for the "shepherd-simple" location picker:
 * pick a viloyat (region), then a tuman (district) — the way people here actually
 * describe where they are. Each region carries an approximate centroid so even a
 * picker-only listing (no GPS) still gets a usable distance for "Yaqin atrofda".
 */
export type Region = { name: string; lat: number; lng: number; districts: string[] };

export const REGIONS: Region[] = [
  {
    name: 'Toshkent shahri',
    lat: 41.311,
    lng: 69.28,
    districts: [
      'Bektemir', 'Chilonzor', 'Mirobod', 'Mirzo Ulugʻbek', 'Olmazor', 'Sergeli',
      'Shayxontohur', 'Uchtepa', 'Yakkasaroy', 'Yashnobod', 'Yangihayot', 'Yunusobod',
    ],
  },
  {
    name: 'Toshkent viloyati',
    lat: 41.0,
    lng: 69.5,
    districts: [
      'Bekobod', 'Boʻka', 'Boʻstonliq', 'Chinoz', 'Ohangaron', 'Oqqoʻrgʻon',
      'Oʻrtachirchiq', 'Parkent', 'Piskent', 'Quyichirchiq', 'Qibray', 'Toshkent tumani',
      'Yangiyoʻl', 'Yuqorichirchiq', 'Zangiota', 'Nurafshon',
    ],
  },
  {
    name: 'Andijon',
    lat: 40.783,
    lng: 72.35,
    districts: [
      'Andijon tumani', 'Asaka', 'Baliqchi', 'Boʻz', 'Buloqboshi', 'Izboskan',
      'Jalaquduq', 'Xoʻjaobod', 'Qoʻrgʻontepa', 'Marhamat', 'Oltinkoʻl', 'Paxtaobod',
      'Shahrixon', 'Ulugʻnor', 'Andijon shahri',
    ],
  },
  {
    name: 'Fargʻona',
    lat: 40.386,
    lng: 71.787,
    districts: [
      'Bagʻdod', 'Beshariq', 'Buvayda', 'Dangʻara', 'Fargʻona tumani', 'Furqat',
      'Qoʻshtepa', 'Quva', 'Rishton', 'Soʻx', 'Toshloq', 'Uchkoʻprik', 'Oltiariq',
      'Oʻzbekiston', 'Yozyovon', 'Margʻilon', 'Qoʻqon',
    ],
  },
  {
    name: 'Namangan',
    lat: 40.998,
    lng: 71.672,
    districts: [
      'Chortoq', 'Chust', 'Davlatobod', 'Kosonsoy', 'Mingbuloq', 'Namangan tumani',
      'Norin', 'Pop', 'Toʻraqoʻrgʻon', 'Uchqoʻrgʻon', 'Uychi', 'Yangiqoʻrgʻon',
    ],
  },
  {
    name: 'Samarqand',
    lat: 39.654,
    lng: 66.975,
    districts: [
      'Bulungʻur', 'Ishtixon', 'Jomboy', 'Kattaqoʻrgʻon', 'Qoʻshrabot', 'Narpay',
      'Nurobod', 'Oqdaryo', 'Paxtachi', 'Payariq', 'Pastdargʻom', 'Samarqand tumani',
      'Toyloq', 'Urgut', 'Kattaqoʻrgʻon shahri',
    ],
  },
  {
    name: 'Buxoro',
    lat: 39.767,
    lng: 64.421,
    districts: [
      'Buxoro tumani', 'Gʻijduvon', 'Jondor', 'Kogon', 'Olot', 'Peshku', 'Qorakoʻl',
      'Qorovulbozor', 'Romitan', 'Shofirkon', 'Vobkent',
    ],
  },
  {
    name: 'Xorazm',
    lat: 41.35,
    lng: 60.633,
    districts: [
      'Bogʻot', 'Gurlan', 'Xonqa', 'Hazorasp', 'Xiva', 'Qoʻshkoʻpir', 'Shovot',
      'Urganch tumani', 'Yangiariq', 'Yangibozor', 'Urganch shahri',
    ],
  },
  {
    name: 'Qashqadaryo',
    lat: 38.86,
    lng: 65.79,
    districts: [
      'Chiroqchi', 'Dehqonobod', 'Gʻuzor', 'Qamashi', 'Qarshi tumani', 'Kasbi',
      'Kitob', 'Koson', 'Mirishkor', 'Muborak', 'Nishon', 'Shahrisabz', 'Yakkabogʻ',
      'Qarshi shahri',
    ],
  },
  {
    name: 'Surxondaryo',
    lat: 37.94,
    lng: 67.57,
    districts: [
      'Angor', 'Bandixon', 'Boysun', 'Denov', 'Jarqoʻrgʻon', 'Qiziriq', 'Qumqoʻrgʻon',
      'Muzrabot', 'Oltinsoy', 'Sariosiyo', 'Sherobod', 'Shoʻrchi', 'Termiz tumani',
      'Uzun', 'Termiz shahri',
    ],
  },
  {
    name: 'Jizzax',
    lat: 40.115,
    lng: 67.842,
    districts: [
      'Arnasoy', 'Baxmal', 'Doʻstlik', 'Forish', 'Gʻallaorol', 'Sharof Rashidov',
      'Mirzachoʻl', 'Paxtakor', 'Yangiobod', 'Zomin', 'Zarbdor', 'Zafarobod',
      'Jizzax shahri',
    ],
  },
  {
    name: 'Sirdaryo',
    lat: 40.5,
    lng: 68.7,
    districts: [
      'Boyovut', 'Guliston tumani', 'Mirzaobod', 'Oqoltin', 'Sardoba', 'Sayxunobod',
      'Sirdaryo', 'Xovos', 'Shirin', 'Yangiyer', 'Guliston shahri',
    ],
  },
  {
    name: 'Navoiy',
    lat: 40.104,
    lng: 65.373,
    districts: [
      'Konimex', 'Karmana', 'Navbahor', 'Nurota', 'Qiziltepa', 'Xatirchi', 'Tomdi',
      'Uchquduq', 'Zarafshon', 'Navoiy shahri',
    ],
  },
  {
    name: 'Qoraqalpogʻiston',
    lat: 42.46,
    lng: 59.61,
    districts: [
      'Amudaryo', 'Beruniy', 'Chimboy', 'Ellikqalʼa', 'Kegayli', 'Moʻynoq',
      'Nukus tumani', 'Qanlikoʻl', 'Qoraoʻzak', 'Qoʻngʻirot', 'Shumanay', 'Taxtakoʻpir',
      'Toʻrtkoʻl', 'Xoʻjayli', 'Nukus shahri',
    ],
  },
];

export const REGION_NAMES = REGIONS.map((r) => r.name);

export function districtsOf(region: string): string[] {
  return REGIONS.find((r) => r.name === region)?.districts ?? [];
}

/** Approximate coordinates for a region (used when a listing has no GPS fix). */
export function regionCentroid(region?: string): { lat: number; lng: number } | null {
  if (!region) return null;
  const r = REGIONS.find((x) => x.name === region);
  return r ? { lat: r.lat, lng: r.lng } : null;
}

/** Great-circle distance in km between two coordinates. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Best-effort region name from GPS coords — nearest region centroid. */
export function nearestRegion(coords: { lat: number; lng: number }): Region {
  return REGIONS.reduce((best, r) =>
    haversineKm(coords, r) < haversineKm(coords, best) ? r : best
  );
}
