import { Ionicons } from '@expo/vector-icons';
import { api } from '@halolmia/backend/convex/_generated/api';
import type { Id } from '@halolmia/backend/convex/_generated/dataModel';
import { useAction, useMutation, useQuery } from 'convex/react';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Chip } from 'heroui-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/app-text';
import { Logo } from '../../components/logo';
import { VerifiedSellerBadge } from '../../components/trust-safety';
import { CATEGORY_IMAGES } from '../../constants/category-images';
import { BRAND_BLUE } from '../../constants/theme';
import { useAuth } from '../../lib/auth';
import { runtime } from '../../lib/runtime';
import { StripeCardSheet } from '../../components/stripe-card-sheet';

// Set EXPO_PUBLIC_BOT_USERNAME (without @) so Telegram verify deep link works.
const BOT_USERNAME = process.env.EXPO_PUBLIC_BOT_USERNAME ?? '';

const TOPUP_PRESETS = [10000, 25000, 50000, 100000];
function makeToken(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return (
    Math.random().toString(36).slice(2) +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2)
  );
}

const fmtSom = (n: number) => `${n.toLocaleString('ru-RU')} soʻm`;
const fmtNumber = (n: number) => n.toLocaleString('ru-RU');

const STATUS_META: Record<string, { label: string; bg: string }> = {
  active: { label: 'Faol', bg: '#86EFAC' },
  pending: { label: 'Tekshiruvda', bg: '#FCD34D' },
  rejected: { label: 'Rad etilgan', bg: '#FCA5A5' },
};

function GlassStat({ label, value }: { label: string; value: number }) {
  return (
    <View className="min-w-16 rounded-2xl border border-white/70 bg-white/45 px-2.5 py-2">
      <AppText className="text-center font-display text-xl text-[#0F172A]">{value}</AppText>
      <AppText className="text-center text-[11px] font-semibold text-[#64748B]">{label}</AppText>
    </View>
  );
}

export default function Profile() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { userId, rootUserId, user, logout, adoptSession, switchAccount } = useAuth();
  const compactBalanceCard = width < 560;

  const listings = useQuery(
    api.listings.byOwner,
    userId ? { ownerId: userId } : 'skip'
  );
  const reels = useQuery(
    api.reels.bySeller,
    userId ? { sellerId: userId, userId, limit: 8 } : 'skip'
  ) ?? [];
  const accountOwnerId = rootUserId ?? userId;
  const accounts = useQuery(
    api.users.accountSwitcher,
    accountOwnerId && userId ? { ownerId: accountOwnerId, activeId: userId } : 'skip'
  ) ?? [];

  const createStripeTopupPayment = useAction(api.jamgarma.createStripeTopupPayment);
  const updateProfile = useMutation(api.users.updateProfile);
  const startTelegramSession = useMutation(api.authTelegram.start);
  const consumeTelegramSession = useMutation(api.authTelegram.consume);
  const createLinkedAccount = useMutation(api.users.createLinkedAccount);
  const [topupOpen, setTopupOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [newAccountOpen, setNewAccountOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [nameOpen, setNameOpen] = useState(false);
  const [namePrompted, setNamePrompted] = useState(false);
  const [realName, setRealName] = useState('');
  const [newAccountKind, setNewAccountKind] = useState<'business' | 'farm' | 'dealer'>('business');
  const [amount, setAmount] = useState('');
  const [cardOpen, setCardOpen] = useState(false);
  const [cardClientSecret, setCardClientSecret] = useState<string | null>(null);
  const [cardAmount, setCardAmount] = useState(0);
  const [verifyToken, setVerifyToken] = useState<string | null>(null);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [accountBusy, setAccountBusy] = useState(false);
  const verifyStatus = useQuery(
    api.authTelegram.status,
    verifyToken ? { token: verifyToken } : 'skip'
  );

  const activeAccount = accounts.find((a) => a._id === userId) ?? accounts[0];

  useEffect(() => {
    if (!namePrompted && user?.name === 'Foydalanuvchi') {
      setNamePrompted(true);
      setNameOpen(true);
    }
  }, [namePrompted, user?.name]);

  const saveRealName = async () => {
    if (!userId || realName.trim().length < 2) return;
    try {
      await updateProfile({ id: userId, name: realName.trim() });
      setNameOpen(false);
    } catch (error) {
      Alert.alert('Xatolik', error instanceof Error ? error.message : 'Ism saqlanmadi.');
    }
  };

  useEffect(() => {
    if (verifyToken && verifyStatus?.status === 'verified') {
      const token = verifyToken;
      setVerifyToken(null);
      consumeTelegramSession({ token })
        .then((verifiedUserId) => adoptSession(verifiedUserId as Id<'users'>))
        .then(() => {
          Alert.alert('Tasdiqlandi', 'Endi siz tasdiqlangan sotuvchisiz.');
        })
        .catch(() => {
          Alert.alert('Xatolik', 'Telegram tasdiqlash sessiyasi ishlamadi.');
        });
    } else if (verifyStatus?.status === 'expired') {
      setTimeout(() => setVerifyToken(null), 0);
      Alert.alert('Muddati tugadi', 'Telegram tasdiqlash muddati tugadi. Qayta urinib koÊ»ring.');
    }
  }, [verifyStatus, verifyToken, consumeTelegramSession, adoptSession]);

  useEffect(() => {
    if (!verifyToken) return;
    const timer = setTimeout(() => {
      setVerifyToken(null);
      Alert.alert('Muddati tugadi', "Telegram tasdiqlash muddati tugadi. Qayta urinib ko'ring.");
    }, 5 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [verifyToken]);

  const startTopup = async (som: number) => {
    if (!userId || !Number.isFinite(som) || som < 10_000 || busy) return;
    setBusy(true);
    try {
      const payment = await createStripeTopupPayment({
        userId,
        amount: Math.round(som),
      });
      if (!payment.ok) throw new Error(payment.error);
      setTopupOpen(false);
      setAmount('');
      setCardAmount(Math.round(som));
      setCardClientSecret(payment.clientSecret);
      setCardOpen(true);
    } catch (e) {
      Alert.alert('Xatolik', e instanceof Error ? e.message : 'Toʻlovni yaratib boʻlmadi.');
    } finally {
      setBusy(false);
    }
  };

  // Not logged in → login prompt.
  if (!userId) {
    return (
      <View className="flex-1" style={{ backgroundColor: '#F4F5F7' }}>
        <SafeAreaView className="flex-1" edges={['top']}>
          <View className="flex-row items-center justify-between px-4 pb-2 pt-2">
            <AppText className="font-bold text-2xl text-foreground">Profil</AppText>
            <Pressable onPress={() => router.push('/settings')} hitSlop={8} className="flex-row items-center active:opacity-70">
              <Ionicons name="settings-outline" size={20} color={BRAND_BLUE} />
            </Pressable>
          </View>

          <View className="px-4 pt-8">
            <View className="items-center rounded-2xl bg-surface px-5 py-6">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: BRAND_BLUE + '1A' }}>
                <Ionicons name="person-outline" size={32} color={BRAND_BLUE} />
              </View>
              <AppText className="mb-2 text-center font-bold text-xl text-foreground">
                Hisobingizga kiring
              </AppText>
              <AppText className="mb-6 text-center text-base leading-6 text-muted">
                Eʼlon joylash, saqlash va sotuvchilar bilan bogʻlanish uchun kiring.
              </AppText>
              <Pressable
                onPress={() => router.push('/login')}
                className="h-14 w-full items-center justify-center rounded-2xl active:opacity-90"
                style={{ backgroundColor: BRAND_BLUE }}
              >
                <AppText className="font-semibold text-base text-white">Kirish</AppText>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const activeListings = listings?.filter((l) => l.status === 'active').length ?? 0;
  const pendingListings = listings?.filter((l) => l.status === 'pending').length ?? 0;
  const displayName = user?.name ?? 'behzod';
  const phone = user?.phone ?? user?.name ?? 'Profil';
  // Verified = Telegram account + Telegram-confirmed phone (see authTelegram.markTelegramVerified).
  const isVerified = !!(user?.verifiedAt || user?.telegramId);

  const openTelegramVerify = async () => {
    if (!BOT_USERNAME) {
      Alert.alert('Sozlanmagan', 'Telegram bot hali ulanmagan.');
      return;
    }
    if (!userId || verifyBusy) return;
    const token = makeToken();
    setVerifyBusy(true);
    try {
      await startTelegramSession({ token });
      setVerifyToken(token);
      await Linking.openURL(`https://t.me/${BOT_USERNAME}?start=${token}`);
      setVerifyBusy(false);
    } catch {
      setTimeout(() => setVerifyToken(null), 0);
      setVerifyBusy(false);
      Alert.alert('Xatolik', 'Telegramni ochib boʻlmadi. Qayta urinib koʻring.');
    }
  };

  const switchTo = async (id: Id<'users'>) => {
    setAccountOpen(false);
    await switchAccount(id);
  };

  const addAccount = async () => {
    if (!accountOwnerId || accountBusy) return;
    setAccountBusy(true);
    try {
      const id = await createLinkedAccount({
        ownerId: accountOwnerId,
        name: newAccountName.trim(),
        kind: newAccountKind,
      });
      setNewAccountName('');
      setNewAccountKind('business');
      setNewAccountOpen(false);
      setAccountOpen(false);
      await switchAccount(id as Id<'users'>);
    } catch (e) {
      Alert.alert('Xatolik', e instanceof Error ? e.message : "Profil qo'shib bo'lmadi.");
    } finally {
      setAccountBusy(false);
    }
  };

  const verifying = !!verifyToken && verifyStatus?.status === 'pending';

  return (
    <View className="flex-1" style={{ backgroundColor: '#EEF4FA' }}>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(10,108,255,0.22)', 'rgba(255,255,255,0)', 'rgba(15,23,42,0.08)']}
        locations={[0, 0.48, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View className="absolute -right-24 -top-20 h-72 w-72 rounded-full bg-white/70" />
      <View className="absolute -left-20 top-40 h-52 w-52 rounded-full" style={{ backgroundColor: BRAND_BLUE + '18' }} />
      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 pb-3 pt-2">
            <AppText className="font-display text-3xl text-[#0F172A]" numberOfLines={1}>
              {phone}
            </AppText>
            <Pressable
              onPress={() => router.push('/settings')}
              hitSlop={8}
              className="h-10 flex-row items-center rounded-full border border-white/70 bg-white/60 px-3 active:opacity-70"
            >
              <Ionicons name="settings-outline" size={20} color={BRAND_BLUE} />
              <AppText className="ml-1.5 font-medium text-base" style={{ color: BRAND_BLUE }}>Sozlamalar</AppText>
            </Pressable>
          </View>

          <Pressable
            onPress={() => setAccountOpen(true)}
            className="mx-4 mb-2 flex-row items-center rounded-[24px] border border-white/70 bg-white/70 px-4 py-3 active:opacity-80"
            style={{
              shadowColor: '#0F172A',
              shadowOpacity: 0.08,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 8 },
              elevation: 4,
            }}
          >
            <View className="h-11 w-11 items-center justify-center overflow-hidden rounded-full" style={{ backgroundColor: BRAND_BLUE }}>
              {activeAccount?.avatarUrl ? (
                <Image source={{ uri: activeAccount.avatarUrl }} contentFit="cover" style={{ width: '100%', height: '100%' }} />
              ) : (
                <AppText className="font-display text-xl text-white">
                  {(activeAccount?.name ?? displayName).charAt(0).toUpperCase()}
                </AppText>
              )}
            </View>
            <View className="ml-3 flex-1">
              <View className="flex-row items-center">
                <AppText className="font-bold text-base text-[#0F172A]" numberOfLines={1}>
                  {activeAccount?.name ?? displayName}
                </AppText>
                {activeAccount?.kind !== 'personal' && (
                  <View
                    className="ml-2 rounded-full px-2 py-0.5"
                    style={{
                      backgroundColor:
                        activeAccount?.approvalStatus === 'pending'
                          ? '#FEF3C7'
                          : activeAccount?.approvalStatus === 'rejected'
                            ? '#FEE2E2'
                            : '#EFF6FF',
                    }}
                  >
                    <AppText
                      className="text-[10px] font-bold"
                      style={{
                        color:
                          activeAccount?.approvalStatus === 'pending'
                            ? '#B45309'
                            : activeAccount?.approvalStatus === 'rejected'
                              ? '#DC2626'
                              : BRAND_BLUE,
                      }}
                    >
                      {activeAccount?.approvalStatus === 'pending'
                        ? 'Admin tekshiruvda'
                        : activeAccount?.approvalStatus === 'rejected'
                          ? 'Rad etildi'
                          : activeAccount?.label}
                    </AppText>
                  </View>
                )}
              </View>
              <AppText className="text-[12px] font-semibold text-[#64748B]">
                {accounts.length > 1 ? `${accounts.length} profil ulangan` : "Profil qo'shish mumkin"}
              </AppText>
            </View>
            <Ionicons name="swap-horizontal" size={21} color={BRAND_BLUE} />
          </Pressable>

          {/* Balance card */}
          <View
            className="mx-4 mt-2 overflow-hidden rounded-[30px] border border-white/70 p-4"
            style={{
              backgroundColor: 'rgba(255,255,255,0.62)',
              shadowColor: '#0F172A',
              shadowOpacity: 0.12,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 14 },
              elevation: 8,
            }}
          >
            <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(255,255,255,0.92)', 'rgba(255,255,255,0.20)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View className="absolute -right-12 -top-10 h-32 w-32 rounded-full" style={{ backgroundColor: BRAND_BLUE + '18' }} />
            <View
              className="items-start justify-between"
              style={{
                flexDirection: compactBalanceCard ? 'column' : 'row',
                gap: compactBalanceCard ? 12 : 8,
              }}
            >
              <View className="min-w-0" style={{ flex: compactBalanceCard ? undefined : 1 }}>
                <AppText className="text-xs font-semibold uppercase tracking-[1.4px] text-[#64748B]">Kabinet</AppText>
                <AppText className="mt-1 font-bold text-lg text-[#0F172A]">Halolmi hisobi</AppText>
                <View className="mt-1 flex-row flex-wrap items-baseline">
                  <AppText className="font-display text-4xl text-[#0F172A]">
                    {fmtNumber(user?.balance ?? 0)}
                  </AppText>
                  <AppText className="ml-1.5 font-display text-2xl text-[#0F172A]">soʻm</AppText>
                </View>
              </View>
              <Pressable
                onPress={() => setTopupOpen(true)}
                className="h-12 flex-row items-center justify-center rounded-2xl px-4 active:opacity-80"
                style={{
                  alignSelf: compactBalanceCard ? 'stretch' : 'flex-start',
                  backgroundColor: BRAND_BLUE,
                  minWidth: compactBalanceCard ? undefined : 112,
                }}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <AppText className="ml-1 font-bold text-base text-white" numberOfLines={1}>To'ldirish</AppText>
              </Pressable>
            </View>
            <View className="my-4 h-px bg-white/70" />
            <View className="flex-row items-center">
              <View className="mr-3 h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: BRAND_BLUE }}>
                <AppText className="text-white" style={{ fontFamily: 'Fredoka-SemiBold', fontSize: 18 }}>
                  {displayName.charAt(0).toUpperCase()}
                </AppText>
              </View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <AppText className="font-bold text-base text-[#0F172A]" numberOfLines={1}>
                    {displayName}
                  </AppText>
                  {isVerified ? (
                    <View className="ml-1">
                      <VerifiedSellerBadge compact iconOnly />
                    </View>
                  ) : null}
                </View>
                <AppText className="mt-0.5 text-sm text-[#64748B]">Sotuvchi kabineti</AppText>
              </View>
              <View className="flex-row gap-2">
                <GlassStat label="Faol" value={activeListings} />
                <GlassStat label="Kutmoqda" value={pendingListings} />
              </View>
            </View>
          </View>

          {/* Jamg'arma shortcut */}
          <Pressable
            onPress={() => router.push('/jamgarma')}
            className="mx-4 mt-3 flex-row items-center rounded-3xl border border-[#DCE9FF] bg-[#EFF6FF] px-4 py-4 active:opacity-80"
          >
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white">
              <AppText className="text-2xl">🐑</AppText>
            </View>
            <View className="ml-3 flex-1">
              <AppText className="font-bold text-base text-[#0F172A]">Halolmi Jamg‘arma</AppText>
              <AppText className="mt-0.5 text-sm text-[#64748B]">Hayvon uchun oz-ozdan yig‘ing</AppText>
            </View>
            <Ionicons name="chevron-forward" size={21} color={BRAND_BLUE} />
          </Pressable>

          {/* Verified seller: Telegram + phone match */}
          {!isVerified ? (
          <View
            className="mx-4 mt-3 overflow-hidden rounded-2xl border px-4 py-3.5"
            style={{
              backgroundColor: '#FFFBEB',
              borderColor: '#FDE68A',
            }}
          >
            <View className="flex-row items-start">
              <Ionicons name="shield-outline" size={22} color="#B45309" />
              <View className="ml-2.5 flex-1">
                <AppText
                  className="font-semibold text-sm"
                  style={{ color: isVerified ? '#1E40AF' : '#92400E' }}
                >
                  {isVerified ? 'Tasdiqlangan sotuvchi' : 'Hisobni tasdiqlang'}
                </AppText>
                <AppText
                  className="mt-0.5 text-xs leading-5"
                  style={{ color: isVerified ? '#1E3A8A' : '#92400E' }}
                >
                  {isVerified
                    ? 'Telegram va telefon raqamingiz mos. Xaridorlar eʼlonlaringizda ishonch belgisini koʻradi.'
                    : 'Telegram orqali telefoningizni ulashing — eʼlonlaringizda «Tasdiqlangan sotuvchi» chiqadi.'}
                </AppText>
                {!isVerified ? (
                  <Pressable
                    onPress={openTelegramVerify}
                    disabled={verifyBusy || verifying}
                    className="mt-2.5 h-10 flex-row items-center justify-center self-start rounded-xl px-3.5 active:opacity-85"
                    style={{ backgroundColor: '#229ED9', opacity: verifyBusy || verifying ? 0.72 : 1 }}
                  >
                    {verifyBusy || verifying ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="paper-plane" size={16} color="#fff" />
                    )}
                    <AppText className="ml-1.5 font-semibold text-sm text-white">
                      {verifying ? 'Telegram kutilmoqda...' : 'Telegram orqali tasdiqlash'}
                    </AppText>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
          ) : null}

          {runtime.supportsReels && reels.length > 0 && (
            <View className="mt-5">
              <View className="mb-2 flex-row items-center justify-between px-4">
                <AppText className="font-bold text-lg text-foreground">Mening videolarim</AppText>
                <Pressable
                  onPress={() => router.push({ pathname: '/reels', params: { start: reels[0]._id, sellerId: userId } } as never)}
                  hitSlop={8}
                  className="flex-row items-center active:opacity-70"
                >
                  <AppText className="font-medium text-base" style={{ color: BRAND_BLUE }}>Ko'rish</AppText>
                  <Ionicons name="chevron-forward" size={18} color={BRAND_BLUE} />
                </Pressable>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
              >
                {reels.map((r) => (
                  <Pressable
                    key={r._id}
                    onPress={() => router.push({ pathname: '/reels', params: { start: r._id, sellerId: userId } } as never)}
                    className="overflow-hidden rounded-2xl bg-black active:opacity-90"
                    style={{ width: 118, aspectRatio: 0.72 }}
                  >
                    {r.thumbUrl ? (
                      <Image
                        source={{ uri: r.thumbUrl }}
                        contentFit="cover"
                        style={{ position: 'absolute', width: '100%', height: '100%' }}
                      />
                    ) : (
                      <View className="h-full w-full items-center justify-center bg-neutral-900">
                        <Ionicons name="videocam" size={26} color="#fff" />
                      </View>
                    )}
                    <View className="absolute right-2 top-2 h-7 w-7 items-center justify-center rounded-full bg-black/45">
                      <Ionicons name="play" size={16} color="#fff" style={{ marginLeft: 2 }} />
                    </View>
                    <View className="absolute bottom-0 left-0 right-0 p-2" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
                      <AppText className="font-semibold text-xs text-white" numberOfLines={2}>
                        {r.price ?? r.title}
                      </AppText>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* My listings */}
          <AppText className="mb-2 mt-5 px-4 font-bold text-lg text-foreground">
            Mening eʼlonlarim
          </AppText>

          {listings === undefined ? (
            <View className="mx-4 rounded-2xl bg-surface p-6 items-center">
              <AppText className="text-muted">Yuklanmoqda...</AppText>
            </View>
          ) : listings.length === 0 ? (
            <View className="mx-4 rounded-2xl bg-surface p-6 items-center">
              <AppText className="mb-3 text-center text-base text-muted">
                Hali eʼloningiz yoʻq.
              </AppText>
              <Pressable
                onPress={() => router.push('/sell')}
                className="h-12 flex-row items-center justify-center rounded-xl px-5 active:opacity-90"
                style={{ backgroundColor: BRAND_BLUE }}
              >
                <AppText className="font-semibold text-base text-white">Eʼlon joylash</AppText>
              </Pressable>
            </View>
          ) : (
            listings.map((l) => {
              const meta = STATUS_META[l.status] ?? STATUS_META.pending;
              const img = CATEGORY_IMAGES[l.category] ?? CATEGORY_IMAGES.cattle;
              return (
                <Pressable
                  key={l._id}
                  onPress={() => router.push({ pathname: '/listing/[id]', params: { id: l._id } })}
                  className="mx-4 mb-3 overflow-hidden rounded-[28px] border border-white/70 p-3 active:opacity-90"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.64)',
                    shadowColor: '#0F172A',
                    shadowOpacity: 0.09,
                    shadowRadius: 18,
                    shadowOffset: { width: 0, height: 10 },
                    elevation: 5,
                  }}
                >
                  <BlurView intensity={34} tint="light" style={StyleSheet.absoluteFill} />
                  <LinearGradient
                    pointerEvents="none"
                    colors={['rgba(255,255,255,0.82)', 'rgba(255,255,255,0.16)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View className="mb-3 flex-row items-start justify-between">
                    <View className="flex-1 pr-3">
                      <AppText className="font-bold text-base text-[#0F172A]" numberOfLines={1}>{l.title}</AppText>
                      <AppText className="mt-0.5 font-display text-2xl text-[#0F172A]" numberOfLines={1}>{l.price}</AppText>
                    </View>
                    <Chip size="sm" variant="secondary" color="warning" className="border border-white/70" style={{ backgroundColor: meta.bg }}>
                      <Chip.Label className="font-bold text-[#0F172A]">{meta.label}</Chip.Label>
                    </Chip>
                  </View>
                  <View className="flex-row">
                    <View className="mr-4 items-center justify-center overflow-hidden rounded-[22px] bg-white/60" style={{ width: 128, height: 100 }}>
                      {l.photoUrls?.[0] ? (
                        <Image source={{ uri: l.photoUrls[0] }} contentFit="cover" style={{ width: '100%', height: '100%' }} />
                      ) : (
                        <Image source={img} contentFit="contain" style={{ width: '86%', height: '86%' }} />
                      )}
                    </View>
                    <View className="flex-1 justify-center">
                      <View className="flex-row items-center">
                        <Ionicons name="location-outline" size={17} color={BRAND_BLUE} />
                        <AppText className="ml-1.5 text-sm font-semibold text-[#475569]" numberOfLines={1}>{l.city}</AppText>
                      </View>
                      <View className="mt-3 flex-row items-center rounded-full bg-white/55 px-3 py-2">
                        <Ionicons name="analytics-outline" size={16} color="#64748B" />
                        <AppText className="ml-2 text-xs font-semibold text-[#64748B]">
                          Ko'rish va boshqarish
                        </AppText>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}

          {/* Logout */}
          <Pressable
            onPress={async () => {
              await logout();
              router.replace('/home');
            }}
            className="mx-4 mt-4 h-12 flex-row items-center justify-center rounded-2xl border border-white/70 bg-white/55 active:opacity-80"
          >
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <AppText className="ml-2 font-semibold text-base" style={{ color: '#EF4444' }}>Chiqish</AppText>
          </Pressable>

          {/* Version */}
          <View className="mt-8 items-center">
            <Logo className="text-[#0F172A]" size={18} />
            <AppText className="mt-1 text-sm text-muted">1.0.0 versiyasi</AppText>
          </View>
        </ScrollView>

        <Modal visible={accountOpen} transparent animationType="slide" onRequestClose={() => setAccountOpen(false)}>
          <Pressable className="flex-1 bg-black/40" onPress={() => setAccountOpen(false)} />
          <View className="rounded-t-3xl bg-background px-5 pb-8 pt-5">
            <View className="mb-4 flex-row items-center justify-between">
              <View>
                <AppText className="font-bold text-xl text-foreground">Profil almashtirish</AppText>
                <AppText className="mt-0.5 text-sm text-muted">Sotish qaysi profil nomidan ketishini tanlang.</AppText>
              </View>
              <Pressable onPress={() => setAccountOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={26} color="#9ca3af" />
              </Pressable>
            </View>

            {accounts.map((account) => (
              <Pressable
                key={account._id}
                onPress={() => switchTo(account._id)}
                className="mb-2 flex-row items-center rounded-2xl border border-border bg-surface px-3 py-3 active:opacity-80"
              >
                <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-full" style={{ backgroundColor: account.isActive ? BRAND_BLUE : '#E5E7EB' }}>
                  {account.avatarUrl ? (
                    <Image source={{ uri: account.avatarUrl }} contentFit="cover" style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <AppText className="font-display text-lg" style={{ color: account.isActive ? '#fff' : '#334155' }}>
                      {account.name.charAt(0).toUpperCase()}
                    </AppText>
                  )}
                </View>
                <View className="ml-3 flex-1">
                  <View className="flex-row items-center">
                    <AppText className="font-bold text-base text-foreground" numberOfLines={1}>{account.name}</AppText>
                    {account.verified && <Ionicons name="checkmark-circle" size={15} color={BRAND_BLUE} style={{ marginLeft: 5 }} />}
                  </View>
                  <AppText className="text-sm text-muted" numberOfLines={1}>
                    {account.approvalStatus === 'pending'
                      ? 'Admin tasdiqlashi kutilmoqda'
                      : account.approvalStatus === 'rejected'
                        ? 'Admin rad etdi'
                        : account.label}{' '}
                    · {account.activeListingsCount} faol e'lon
                  </AppText>
                </View>
                {account.isActive ? (
                  <Ionicons name="radio-button-on" size={22} color={BRAND_BLUE} />
                ) : (
                  <Ionicons name="radio-button-off" size={22} color="#CBD5E1" />
                )}
              </Pressable>
            ))}

            <Pressable
              onPress={() => setNewAccountOpen(true)}
              className="mt-2 h-13 flex-row items-center justify-center rounded-2xl active:opacity-90"
              style={{ height: 52, backgroundColor: BRAND_BLUE }}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <AppText className="ml-2 font-semibold text-base text-white">Sotuvchi profil qo'shish</AppText>
            </Pressable>
          </View>
        </Modal>

        <Modal visible={newAccountOpen} transparent animationType="slide" onRequestClose={() => setNewAccountOpen(false)}>
          <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable className="flex-1 bg-black/40" onPress={() => setNewAccountOpen(false)} />
          <View className="rounded-t-3xl bg-background px-5 pb-8 pt-5">
            <View className="mb-4 flex-row items-center justify-between">
              <View>
                <AppText className="font-bold text-xl text-foreground">Yangi sotuvchi profili</AppText>
                <AppText className="mt-0.5 text-sm text-muted">Ferma, diler yoki alohida sotuvchi nomidan soting.</AppText>
              </View>
              <Pressable onPress={() => setNewAccountOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={26} color="#9ca3af" />
              </Pressable>
            </View>

            <TextInput
              value={newAccountName}
              onChangeText={setNewAccountName}
              placeholder="Masalan: Vodiy Ferma"
              placeholderTextColor="#9ca3af"
              className="mb-4 h-14 rounded-xl border px-4 text-lg text-foreground"
              style={{ borderColor: BRAND_BLUE, fontFamily: 'Inter-Regular' }}
            />

            <View className="mb-4 flex-row gap-2">
              {[
                { id: 'business', label: 'Sotuvchi', icon: 'person-circle-outline' },
                { id: 'farm', label: 'Ferma', icon: 'leaf-outline' },
                { id: 'dealer', label: 'Diler', icon: 'storefront-outline' },
              ].map((kind) => {
                const active = newAccountKind === kind.id;
                return (
                  <Pressable
                    key={kind.id}
                    onPress={() => setNewAccountKind(kind.id as 'business' | 'farm' | 'dealer')}
                    className="flex-1 items-center rounded-2xl px-2 py-3 active:opacity-80"
                    style={{ backgroundColor: active ? BRAND_BLUE : '#F1F5F9' }}
                  >
                    <Ionicons name={kind.icon as keyof typeof Ionicons.glyphMap} size={19} color={active ? '#fff' : '#64748B'} />
                    <AppText className="mt-1 text-[12px] font-bold" style={{ color: active ? '#fff' : '#334155' }}>
                      {kind.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={addAccount}
              disabled={accountBusy || !newAccountName.trim()}
              className="h-13 flex-row items-center justify-center rounded-2xl active:opacity-90"
              style={{ height: 52, backgroundColor: newAccountName.trim() ? BRAND_BLUE : '#CBD5E1' }}
            >
              {accountBusy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <AppText className="ml-2 font-semibold text-base text-white">Qo'shish va o'tish</AppText>
                </>
              )}
            </Pressable>
          </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Top-up sheet */}
        <Modal visible={topupOpen} transparent animationType="slide" onRequestClose={() => setTopupOpen(false)}>
          <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable className="flex-1 bg-black/40" onPress={() => setTopupOpen(false)} />
          <View className="rounded-t-3xl bg-background px-5 pb-8 pt-5">
            <View className="mb-4 flex-row items-center justify-between">
              <AppText className="font-bold text-xl text-foreground">Hisobni toʻldirish</AppText>
              <Pressable onPress={() => setTopupOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={26} color="#9ca3af" />
              </Pressable>
            </View>

            <View className="mb-4 flex-row flex-wrap gap-2">
              {TOPUP_PRESETS.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setAmount(String(p))}
                  className="rounded-xl px-4 py-3"
                  style={{ backgroundColor: amount === String(p) ? BRAND_BLUE : '#F1F3F5' }}
                >
                  <AppText className="text-base" style={{ color: amount === String(p) ? '#fff' : '#374151' }}>
                    {fmtSom(p)}
                  </AppText>
                </Pressable>
              ))}
            </View>

            <TextInput
              value={amount}
              onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ''))}
              placeholder="Boshqa summa (min 10 000)"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              className="mb-4 h-14 rounded-xl border px-4 text-lg text-foreground"
              style={{ borderColor: BRAND_BLUE, fontFamily: 'Inter-Regular' }}
            />

            <Pressable
              onPress={() => startTopup(Number(amount))}
              disabled={busy || Number(amount) < 10_000}
              className="h-14 items-center justify-center rounded-2xl"
              style={{ backgroundColor: BRAND_BLUE, opacity: busy || Number(amount) < 10_000 ? 0.5 : 1 }}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <AppText className="font-semibold text-base text-white">
                  {amount ? `${fmtSom(Number(amount))} toʻlash` : 'Toʻlash'}
                </AppText>
              )}
            </Pressable>
            {busy ? (
              <View className="mt-2 flex-row items-center justify-center">
                <ActivityIndicator color={BRAND_BLUE} />
                <AppText className="ml-2 text-sm text-muted">Tolov ochilmoqda...</AppText>
              </View>
            ) : null}
            <AppText className="mt-3 text-center text-xs text-muted">
              Toʻlov Stripe karta orqali
            </AppText>
          </View>
          </KeyboardAvoidingView>
        </Modal>
        <Modal visible={nameOpen} transparent animationType="fade" onRequestClose={() => setNameOpen(false)}>
          <KeyboardAvoidingView className="flex-1 items-center justify-center bg-black/40 px-5" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View className="w-full max-w-[390px] rounded-3xl bg-white p-5">
              <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: BRAND_BLUE + '18' }}>
                <Ionicons name="person-outline" size={22} color={BRAND_BLUE} />
              </View>
              <AppText className="mt-4 font-bold text-xl text-foreground">Ismingizni kiriting</AppText>
              <AppText className="mt-1 text-sm leading-5 text-muted">Profilingizda haqiqiy ismingiz ko'rinadi.</AppText>
              <TextInput
                value={realName}
                onChangeText={setRealName}
                autoFocus
                autoCapitalize="words"
                placeholder="Masalan: Behzod Karimov"
                placeholderTextColor="#94A3B8"
                className="mt-4 h-14 rounded-2xl border px-4 text-base text-foreground"
                style={{ borderColor: BRAND_BLUE, fontFamily: 'Inter-Regular' }}
              />
              <Pressable onPress={saveRealName} disabled={realName.trim().length < 2} className="mt-4 h-14 items-center justify-center rounded-2xl" style={{ backgroundColor: BRAND_BLUE, opacity: realName.trim().length < 2 ? 0.5 : 1 }}>
                <AppText className="font-bold text-white">Saqlash</AppText>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Modal>
        <StripeCardSheet
          visible={cardOpen}
          title="Hisobni to'ldirish"
          amount={fmtSom(cardAmount)}
          clientSecret={cardClientSecret}
          onClose={() => { setCardOpen(false); setCardClientSecret(null); }}
          onPaid={() => { setCardOpen(false); setCardClientSecret(null); Alert.alert("To'lov qabul qilindi", 'Balansingiz yangilandi.'); }}
        />
      </SafeAreaView>
    </View>
  );
}
