import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface AppNotification {
  id: string;
  icon: IoniconName;
  title: string;
  body: string;
  time: string;
  unread: boolean;
}

/** Mock notifications — replaced by Convex/push later. */
export const NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1',
    icon: 'sparkles',
    title: 'Halolmiga xush kelibsiz! 🎉',
    body: 'Hayvonlaringizni oson va tez soting — birinchi eʼloningizni joylang.',
    time: 'Hozir',
    unread: true,
  },
  {
    id: 'n2',
    icon: 'megaphone-outline',
    title: 'Bepul eʼlon joylash',
    body: 'Hozir eʼlon joylashtirish mutlaqo bepul. Imkoniyatdan foydalaning!',
    time: '2 soat oldin',
    unread: true,
  },
  {
    id: 'n3',
    icon: 'bulb-outline',
    title: 'Maslahat',
    body: 'Sifatli rasmlar qoʻshsangiz, hayvoningiz tezroq sotiladi.',
    time: 'Kecha',
    unread: false,
  },
];

export const HAS_UNREAD = NOTIFICATIONS.some((n) => n.unread);
