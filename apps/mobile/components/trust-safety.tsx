import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, TextInput, View } from 'react-native';
import { AppText } from './app-text';
import { BRAND_BLUE } from '../constants/theme';

export function SafetyBanner({ compact = false }: { compact?: boolean }) {
  return (
    <View
      className="rounded-2xl border px-3 py-3"
      style={{ backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }}
    >
      <View className="flex-row items-start">
        <Ionicons name="shield-checkmark-outline" size={20} color="#B45309" />
        <View className="ml-2 flex-1">
          <AppText className="font-semibold text-sm" style={{ color: '#92400E' }}>
            Xavfsiz savdo qiling
          </AppText>
          <AppText
            className={`${compact ? 'text-xs' : 'text-sm'} mt-0.5 leading-5`}
            style={{ color: '#92400E' }}
          >
            {"Oldindan pul yubormang. Hayvonni ko'rib, hujjat va sotuvchi telefonini tekshirgandan keyin to'lov qiling."}
          </AppText>
        </View>
      </View>
    </View>
  );
}

export function VerifiedSellerBadge({ compact = false }: { compact?: boolean }) {
  return (
    <View
      className={`flex-row items-center rounded-full ${compact ? 'px-2 py-1' : 'px-3 py-1.5'}`}
      style={{ backgroundColor: '#DBEAFE' }}
    >
      <Ionicons name="shield-checkmark" size={compact ? 13 : 15} color={BRAND_BLUE} />
      <AppText
        className={`${compact ? 'text-[11px]' : 'text-xs'} ml-1.5 font-bold`}
        style={{ color: BRAND_BLUE }}
      >
        Tasdiqlangan sotuvchi
      </AppText>
    </View>
  );
}

export function DealerBadge({ compact = false }: { compact?: boolean }) {
  return (
    <View
      className={`flex-row items-center rounded-full ${compact ? 'px-2 py-1' : 'px-3 py-1.5'}`}
      style={{ backgroundColor: '#ECFDF5' }}
    >
      <Ionicons name="ribbon" size={compact ? 13 : 15} color="#047857" />
      <AppText
        className={`${compact ? 'text-[11px]' : 'text-xs'} ml-1.5 font-bold`}
        style={{ color: '#047857' }}
      >
        Rasmiy diler
      </AppText>
    </View>
  );
}

export function DealSafetyTips({ compact = false }: { compact?: boolean }) {
  const tips = [
    'Jamoat joyida uchrashing',
    "Hayvonni ko'rib keyin to'lov qiling",
    "Oldindan pul o'tkazmang",
  ];
  return (
    <View className="rounded-2xl bg-surface-secondary px-3 py-3">
      <View className="mb-2 flex-row items-center">
        <Ionicons name="location-outline" size={18} color={BRAND_BLUE} />
        <AppText className="ml-2 font-semibold text-sm text-foreground">
          Uchrashuvni xavfsiz qiling
        </AppText>
      </View>
      {tips.map((tip) => (
        <View key={tip} className="mt-1 flex-row items-start">
          <Ionicons name="checkmark-circle" size={15} color="#16A34A" />
          <AppText
            className={`${compact ? 'text-xs' : 'text-sm'} ml-2 flex-1 leading-5 text-muted`}
          >
            {tip}
          </AppText>
        </View>
      ))}
    </View>
  );
}

export function SuspiciousMessageWarning({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View
      className="mx-3 mb-2 rounded-2xl border px-3 py-2.5"
      style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA' }}
    >
      <View className="flex-row items-start">
        <Ionicons name="warning-outline" size={18} color="#DC2626" />
        <AppText className="ml-2 flex-1 text-xs leading-5" style={{ color: '#991B1B' }}>
          Oldindan to'lov yoki karta ma'lumotlarini so'rash xavfli bo'lishi mumkin.
          To'lovni faqat tekshiruvdan keyin qiling.
        </AppText>
      </View>
    </View>
  );
}

export function TrustBadges({
  phoneVerified,
  telegramLinked,
  activeRecently,
  noReports,
  goodReviews,
  verified,
  online,
  lastSeen,
  rating,
  ratingCount,
  now,
}: {
  phoneVerified?: boolean;
  telegramLinked?: boolean;
  activeRecently?: boolean;
  noReports?: boolean;
  goodReviews?: boolean;
  verified?: boolean;
  online?: boolean;
  lastSeen?: number;
  rating?: number;
  ratingCount?: number;
  now: number;
}) {
  return (
    <View className="mt-2 flex-row flex-wrap gap-2">
      {/* Primary trust signal: Telegram account + Telegram-confirmed phone */}
      {verified && <VerifiedSellerBadge compact />}
      {/* Avoid stacking duplicate chips when the verified badge already covers both. */}
      {!verified && phoneVerified && (
        <Badge icon="call" label="Telefon tasdiqlangan" color="#16A34A" bg="#DCFCE7" />
      )}
      {!verified && telegramLinked && (
        <Badge icon="paper-plane" label="Telegram ulangan" color="#2563EB" bg="#DBEAFE" />
      )}
      {activeRecently && <Badge icon="flash" label="Faol sotuvchi" color="#7C3AED" bg="#EDE9FE" />}
      {noReports && <Badge icon="shield-checkmark-outline" label="Shikoyatsiz" color="#0F766E" bg="#CCFBF1" />}
      {goodReviews && <Badge icon="thumbs-up" label="Yaxshi sharhlar" color="#B45309" bg="#FEF3C7" />}
      <Badge
        icon={online ? 'radio-button-on' : 'time-outline'}
        label={online ? 'Online' : lastSeen ? lastSeenLabel(lastSeen, now) : 'Oxirgi holat nomaʼlum'}
        color={online ? '#16A34A' : '#6B7280'}
        bg={online ? '#DCFCE7' : '#F3F4F6'}
      />
      {!!ratingCount && (
        <Badge
          icon="star"
          label={`${(rating ?? 0).toFixed(1)} reyting (${ratingCount})`}
          color="#B45309"
          bg="#FEF3C7"
        />
      )}
    </View>
  );
}

export function RatingPromptSheet({
  open,
  sellerName,
  stars,
  text,
  onStars,
  onText,
  onClose,
  onSubmit,
}: {
  open: boolean;
  sellerName: string;
  stars: number;
  text: string;
  onStars: (stars: number) => void;
  onText: (text: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose} />
      <View className="rounded-t-3xl bg-background px-5 pb-8 pt-5">
        <View className="mb-4 flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <AppText className="font-bold text-xl text-foreground">Sotuvchini baholang</AppText>
            <AppText className="mt-0.5 text-sm text-muted" numberOfLines={1}>
              {sellerName}
            </AppText>
          </View>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={26} color="#9ca3af" />
          </Pressable>
        </View>

        <View className="mb-4 flex-row justify-center gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Pressable key={i} onPress={() => onStars(i)} hitSlop={6}>
              <Ionicons name={i <= stars ? 'star' : 'star-outline'} size={38} color="#F59E0B" />
            </Pressable>
          ))}
        </View>

        <TextInput
          value={text}
          onChangeText={onText}
          multiline
          placeholder="Fikringizni yozing (ixtiyoriy)"
          placeholderTextColor="#9ca3af"
          className="mb-4 rounded-xl border border-border p-4 text-base text-foreground"
          style={{ minHeight: 90, textAlignVertical: 'top', fontFamily: 'Inter-Regular' }}
        />

        <Pressable
          onPress={onSubmit}
          className="h-14 items-center justify-center rounded-xl active:opacity-90"
          style={{ backgroundColor: BRAND_BLUE }}
        >
          <AppText className="font-semibold text-base text-white">Yuborish</AppText>
        </Pressable>
      </View>
    </Modal>
  );
}

function Badge({
  icon,
  label,
  color,
  bg,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <View className="flex-row items-center rounded-full px-2.5 py-1.5" style={{ backgroundColor: bg }}>
      <Ionicons name={icon} size={13} color={color} />
      <AppText className="ml-1.5 text-xs font-semibold" style={{ color }}>
        {label}
      </AppText>
    </View>
  );
}

function lastSeenLabel(ts: number, now: number) {
  const minutes = Math.max(1, Math.round((now - ts) / 60000));
  if (minutes < 60) return `${minutes} daqiqa oldin`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} soat oldin`;
  return `${Math.round(hours / 24)} kun oldin`;
}
