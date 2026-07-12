import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
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

export function VerifiedSellerBadge({
  compact = false,
  iconOnly = false,
}: {
  compact?: boolean;
  iconOnly?: boolean;
}) {
  if (iconOnly) {
    const size = compact ? 15 : 19;
    return (
      <View
        className="items-center justify-center"
        style={{ width: size, height: size }}
      >
        <View
          className="items-center justify-center"
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: BRAND_BLUE,
          }}
        >
          <Svg width={compact ? 11 : 14} height={compact ? 11 : 14} viewBox="0 0 695.133 695.133">
            <Path
              d="M653.241 185.395h-100.08c6.77-13.849 12.311-29.297 16.533-46.208 10.918-43.688 9.406-82.097 9.338-83.71L576.644 0l-27.506 48.233c-14.205 24.91-31.686 46.153-51.961 63.133-16.197 13.567-34.248 24.491-53.637 32.476-12.277 5.053-23.572 8.28-32.965 10.354H284.413c-34.824-7.725-96.158-31.687-138.515-105.963L118.394 0l-2.39 55.477c-.068 1.613-1.572 40.022 9.338 83.71 4.223 16.911 9.764 32.359 16.533 46.208H41.879l-.316 15.682c-.041 2.025-.59 50.053 34.701 86.408 21.628 22.28 51.454 35.085 88.818 38.175-.014 47.958 7.051 83.271 21.47 107.631 26.18 44.217 32.682 175.57 32.977 222.458l.028 4.03 1.929 3.536c2.259 4.14 8.802 12.125 27.224 19.053 22.514 8.466 55.772 12.764 98.856 12.764 43.085 0 76.337-4.291 98.856-12.764 18.422-6.928 24.965-14.913 27.225-19.053l1.928-3.536.027-4.03c.289-46.867 6.777-178.2 32.979-222.451 14.426-24.36 21.482-59.673 21.469-107.631 37.365-3.09 67.191-15.895 88.818-38.175 35.293-36.355 34.742-84.383 34.701-86.409l-.328-15.688ZM178.499 185.395c-14.453-22.891-22.109-50.115-26.146-73.603 8.075 8.967 16.678 17.247 25.782 24.807 13.492 11.198 28.089 20.804 43.565 28.721-9.791 5.122-21.092 11.974-30.169 20.076h-13.032ZM213.872 395.247c-12.167-6.398-15.565-23.887-7.587-39.054 7.978-15.174 24.312-22.287 36.472-15.888 12.167 6.399 15.565 23.88 7.587 39.054-7.978 15.174-24.305 22.287-36.472 15.888ZM443.677 648.396c-3.934 2.354-12.318 6.207-28.385 9.386-8.492-12.62-27.291-29.565-67.032-29.764v-.008c-.117 0-.233 0-.357.008-.117 0-.233-.008-.357-.008v.008c-39.864.198-58.656 17.261-67.108 29.887-16.478-3.199-25.026-7.119-29.016-9.502-.124-6.509-.391-17.104-.975-30.348 23.214-20.33 64.973-69.813 66.511-163.609 2.135-130.166-84.287-149.679-52.278-199.135s67.218-38.786 83.216-38.786c16.005 0 51.214-10.669 83.216 38.786 32.008 49.456-54.414 68.969-52.277 199.135 1.523 92.89 42.486 142.311 65.824 163.005-.584 13.524-.859 24.337-.982 30.949ZM481.954 395.247c-12.166 6.399-28.5-.714-36.473-15.888-7.977-15.174-4.578-32.662 7.588-39.054 12.166-6.399 28.5.714 36.479 15.888 7.973 15.167 4.572 32.656-7.594 39.054ZM516.532 185.395h-12.949c-9.092-8.108-20.414-14.968-30.211-20.097 15.463-7.91 30.045-17.515 43.523-28.7 9.104-7.56 17.715-15.84 25.781-24.807-4.029 23.489-11.691 50.706-26.144 73.604Z"
              fill="#fff"
            />
          </Svg>
        </View>
      </View>
    );
  }

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
