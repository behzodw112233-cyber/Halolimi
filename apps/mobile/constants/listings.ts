import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface ListingSpec {
  icon: IoniconName;
  label: string;
}

export interface Listing {
  id: string;
  title: string;
  price: string;
  /** Key into CATEGORY_IMAGES for the thumbnail. */
  category: string;
  photos: number;
  location: string;
  isNew?: boolean;
  specs: ListingSpec[];
  /** Extra fields for the detail page. */
  year?: string;
  description?: string;
  sellerPhone?: string;
  details?: { label: string; value: string }[];
}

/** Mock marketplace data — replaced by Convex queries later. */
export const LISTINGS: Listing[] = [
  {
    id: 'l1',
    title: 'Holshteyn naslli sigir, sogʻin',
    price: '18 500 000 soʻm',
    category: 'cattle',
    photos: 9,
    location: 'Toshkent, Yunusobod',
    isNew: true,
    year: '2023 yil tugʻilgan',
    sellerPhone: '+998 90 123 ** **',
    description: 'Sogʻlom, naslli sigir. Kuniga 25 litr sut beradi. Barcha vaksinalar qilingan.',
    specs: [
      { icon: 'calendar-outline', label: '3 yosh' },
      { icon: 'barbell-outline', label: '480 kg' },
      { icon: 'ribbon-outline', label: 'Sut zoti' },
    ],
    details: [
      { label: 'Shahar', value: 'Toshkent' },
      { label: 'Zot', value: 'Golshteyn' },
      { label: 'Yoshi', value: '3 yosh' },
      { label: 'Vazni', value: '480 kg' },
    ],
  },
  {
    id: 'l2',
    title: 'Hisor qoʻylari, 4 bosh',
    price: '9 200 000 soʻm',
    category: 'sheep',
    photos: 6,
    location: 'Samarqand',
    sellerPhone: '+998 91 234 ** **',
    description: 'Toza Hisor zoti. Yaxshi holatda, semiz. Qurbonlik uchun ham mos.',
    specs: [
      { icon: 'calendar-outline', label: '1.5 yosh' },
      { icon: 'barbell-outline', label: '70 kg' },
      { icon: 'ribbon-outline', label: 'Hisor' },
    ],
    details: [
      { label: 'Shahar', value: 'Samarqand' },
      { label: 'Zot', value: 'Hisor' },
      { label: 'Yoshi', value: '1.5 yosh' },
      { label: 'Soni', value: '4 bosh' },
    ],
  },
  {
    id: 'l3',
    title: 'Qorabayir ot, yugurik',
    price: '35 000 000 soʻm',
    category: 'horses',
    photos: 12,
    location: 'Qashqadaryo',
    sellerPhone: '+998 93 345 ** **',
    description: 'Zotli Qorabayir ot. Yugurik, sogʻlom. Hujjatlari bor.',
    specs: [
      { icon: 'calendar-outline', label: '5 yosh' },
      { icon: 'ribbon-outline', label: 'Qorabayir' },
      { icon: 'male-outline', label: 'Aygʻir' },
    ],
    details: [
      { label: 'Shahar', value: 'Qashqadaryo' },
      { label: 'Zot', value: 'Qorabayir' },
      { label: 'Yoshi', value: '5 yosh' },
      { label: 'Jinsi', value: 'Aygʻir' },
    ],
  },
  {
    id: 'l4',
    title: 'Broyler joʻjalari, 50 ta',
    price: '1 250 000 soʻm',
    category: 'poultry',
    photos: 4,
    location: 'Andijon',
    sellerPhone: '+998 94 456 ** **',
    description: 'Sogʻlom broyler joʻjalari. Optom va dona narxlarda mavjud.',
    specs: [
      { icon: 'calendar-outline', label: '1 oylik' },
      { icon: 'ribbon-outline', label: 'Broyler' },
      { icon: 'cube-outline', label: '50 ta' },
    ],
    details: [
      { label: 'Shahar', value: 'Andijon' },
      { label: 'Turi', value: 'Broyler' },
      { label: 'Yoshi', value: '1 oylik' },
      { label: 'Soni', value: '50 ta' },
    ],
  },
];
