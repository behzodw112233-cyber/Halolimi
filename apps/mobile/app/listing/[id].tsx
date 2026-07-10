import { api } from '@halolmia/backend/convex/_generated/api';
import type { Id } from '@halolmia/backend/convex/_generated/dataModel';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Linking,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Share,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/app-text';
import { CATEGORY_IMAGES } from '../../constants/category-images';
import { BRAND_BLUE } from '../../constants/theme';
import { useAuth } from '../../lib/auth';
import { recordViewed } from '../../lib/recently-viewed';
import { useSaved } from '../../lib/saved';
import {
  DealerBadge,
  DealSafetyTips,
  RatingPromptSheet,
  SafetyBanner,
  TrustBadges,
} from '../../components/trust-safety';

const SCREEN_W = Dimensions.get('window').width;

const QUICK_MSGS = [
  'Oxirgi narx mi?',
  'Narxni kelishtirasizmi?',
  'Arzonroq qilasizmi?',
  'Qayerda joylashgan?',
];

const REPORT_REASONS = [
  'Aldov yoki firibgarlik',
  'Notoʻgʻri maʼlumot',
  'Nomaqbul kontent',
  'Takroriy eʼlon',
  'Boshqa sabab',
];

export default function ListingDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const listingId = id as Id<'listings'>;
  const { userId, user } = useAuth();
  const [now] = useState(() => Math.floor(Date.now() / 60_000) * 60_000);
  const listing = useQuery(api.listings.get, { id: listingId, now });
  const related = useQuery(api.listings.related, { id: listingId }) ?? [];
  const favorites = useQuery(api.saved.countFor, { listingId }) ?? 0;
  const { isSaved, toggleSave } = useSaved();
  const createReport = useMutation(api.reports.create);
  const submitReview = useMutation(api.reviews.create);
  const incrementViews = useMutation(api.listings.incrementViews);
  const openThread = useMutation(api.messages.openThread);
  const sendMessage = useMutation(api.messages.send);
  const [msg, setMsg] = useState('Assalomu alaykum!');
  const [sending, setSending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [photoIndex, setPhotoIndex] = useState(0);

  // Count only fresh local views so back-and-forth navigation doesn't spam writes.
  useEffect(() => {
    recordViewed(listingId)
      .then((fresh) => {
        if (fresh) incrementViews({ id: listingId }).catch(() => {});
      })
      .catch(() => {});
  }, [listingId, incrementViews]);

  const saved = isSaved(listingId);
  const onToggleSave = () => {
    if (!toggleSave(listingId)) router.push('/login');
  };

  const openChat = async (prefill?: string) => {
    if (!userId) return router.push('/login');
    if (listing?.ownerId === userId) return; // own listing — no self-chat
    if (!listing?.ownerId) return;
    if (sending) return; // guard double-taps so we don't spam the same message
    setSending(true);
    try {
      // Reuse (or create) the buyer↔seller thread for this listing.
      const threadId = await openThread({ meId: userId, listingId });
      // Send the typed/quick message straight away so the seller sees it.
      const text = prefill?.trim();
      if (text) {
        await sendMessage({
          threadId,
          senderId: userId,
          senderName: user?.name ?? user?.phone ?? 'Xaridor',
          text,
        });
      }
      setMsg(''); // clear so the same text can't be re-sent by accident
      router.push({
        pathname: '/chat/[id]',
        params: {
          id: threadId,
          name: listing.sellerName ?? 'Sotuvchi',
          sellerId: listing.ownerId,
        },
      });
    } catch {
      Alert.alert('Xatolik', 'Suhbatni ochib boʻlmadi.');
    } finally {
      setSending(false);
    }
  };

  const sendBargain = () => {
    const text = msg.trim();
    if (!text) return;
    openChat(text);
  };

  const onShare = () => {
    if (!listing) return;
    Share.share({
      message: `${listing.title} — ${listing.price}\n📍 ${listing.city}\n\nHalolmi ilovasida koʻring.`,
    }).catch(() => {});
  };

  const submitReport = (reason: string) => {
    setReportOpen(false);
    createReport({
      listingTitle: listing?.title ?? 'Eʼlon',
      reason,
      reporter: user?.name ?? user?.phone ?? 'Anonim',
      sellerId: listing?.ownerId,
    })
      .then(() => Alert.alert('Yuborildi', 'Shikoyatingiz qabul qilindi. Rahmat!'))
      .catch(() => Alert.alert('Xatolik', 'Shikoyat yuborilmadi. Qayta urinib koʻring.'));
  };

  const callSeller = () => {
    if (!listing?.phone) return;
    Linking.openURL(`tel:${listing.phone.replace(/[^\d+]/g, '')}`).catch(() => {
      Alert.alert('Xatolik', 'Telefon ilovasini ochib bo‘lmadi.');
    });
    if (listing.ownerId && listing.ownerId !== userId) {
      setRatingOpen(true);
    }
  };

  const submitSellerRating = async () => {
    if (!listing?.ownerId) return;
    if (!userId) {
      setRatingOpen(false);
      return router.push('/login');
    }
    try {
      await submitReview({
        sellerId: listing.ownerId,
        authorId: userId,
        authorName: user?.name ?? user?.phone ?? 'Anonim',
        rating: stars,
        text: reviewText.trim(),
      });
      setRatingOpen(false);
      setReviewText('');
      setStars(5);
      Alert.alert('Rahmat', 'Bahoyingiz sotuvchi profiliga qo‘shildi.');
    } catch {
      Alert.alert('Xatolik', 'Baho yuborilmadi. Qayta urinib ko‘ring.');
    }
  };

  if (!listing) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <AppText className="text-muted">Yuklanmoqda...</AppText>
      </View>
    );
  }

  const photos = listing.photoUrls ?? [];
  const photoCount = Math.max(1, photos.length);
  const details = [{ label: 'Shahar', value: listing.city }, ...listing.specs];

  const onHeroScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W));
  };

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View className="h-12 flex-row items-center px-3">
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))} hitSlop={10} className="h-9 w-9 items-center justify-center">
            <Ionicons name="arrow-back" size={24} color={BRAND_BLUE} />
          </Pressable>
          <AppText className="ml-1 flex-1 font-bold text-xl text-foreground" numberOfLines={1}>
            {listing.title.split(',')[0]}
          </AppText>
          <Pressable onPress={onShare} hitSlop={10} className="mr-2 h-9 w-9 items-center justify-center">
            <Ionicons name="share-social-outline" size={22} color={BRAND_BLUE} />
          </Pressable>
          <Pressable onPress={onToggleSave} hitSlop={10} className="h-9 w-9 items-center justify-center">
            <Ionicons name={saved ? 'heart' : 'heart-outline'} size={24} color={saved ? '#EF4444' : BRAND_BLUE} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 90 }}>
          {/* Hero image pager */}
          <View className="bg-surface-secondary" style={{ height: 260 }}>
            {photos.length > 0 ? (
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onHeroScroll}
              >
                {photos.map((uri) => (
                  <Image key={uri} source={{ uri }} contentFit="cover" style={{ width: SCREEN_W, height: 260 }} />
                ))}
              </ScrollView>
            ) : (
              <View className="h-full items-center justify-center">
                <Image source={CATEGORY_IMAGES[listing.category]} contentFit="contain" style={{ width: '75%', height: '85%' }} />
              </View>
            )}
            <View className="absolute bottom-3 right-3 flex-row items-center rounded-md bg-black/60 px-2 py-1">
              <Ionicons name="camera" size={14} color="white" />
              <AppText className="ml-1 text-xs text-white">{Math.min(photoIndex + 1, photoCount)}/{photoCount}</AppText>
            </View>
          </View>

          {/* Price + title */}
          <View className="px-4 pt-4">
            <AppText className="font-bold text-3xl text-foreground">{listing.price}</AppText>
            <AppText className="mt-1 text-base text-muted">{listing.title}</AppText>
            {/* View + favorite counters */}
            <View className="mt-2 flex-row items-center gap-4">
              <View className="flex-row items-center">
                <Ionicons name="eye-outline" size={16} color="#9ca3af" />
                <AppText className="ml-1 text-sm text-muted">{listing.views ?? 0} koʻrildi</AppText>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="heart-outline" size={16} color="#9ca3af" />
                <AppText className="ml-1 text-sm text-muted">{favorites} saqlandi</AppText>
              </View>
            </View>
          </View>

          {listing.priceIntel && (
            <View className="px-4">
              <PriceIntelCard intel={listing.priceIntel} />
            </View>
          )}

          {/* Details table */}
          <View className="mt-4 px-4">
            {details.map((d) => (
              <View key={d.label} className="flex-row justify-between border-b border-border py-3">
                <AppText className="text-base text-muted">{d.label}</AppText>
                <AppText className="text-base font-medium text-foreground">{d.value}</AppText>
              </View>
            ))}
          </View>

          {/* Seller card → profile */}
          {listing.ownerId && (
            <Pressable
              onPress={() => router.push({ pathname: '/seller/[id]', params: { id: listing.ownerId as string } })}
              className="mx-4 mt-4 flex-row items-center rounded-2xl bg-surface-secondary p-3 active:opacity-80"
            >
              <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: BRAND_BLUE }}>
                <AppText className="text-white" style={{ fontFamily: 'Fredoka-SemiBold', fontSize: 18 }}>
                  {(listing.sellerName ?? 'S').charAt(0).toUpperCase()}
                </AppText>
              </View>
              <View className="ml-3 flex-1">
                <View className="flex-row flex-wrap items-center gap-2">
                  <AppText className="font-semibold text-base text-foreground">{listing.sellerName}</AppText>
                  {listing.sellerTrust?.isDealer && <DealerBadge compact />}
                </View>
                <AppText className="text-sm text-muted">Sotuvchi profilini koʻrish</AppText>
                {listing.sellerTrust && (
                  <TrustBadges
                    phoneVerified={listing.sellerTrust.phoneVerified}
                    telegramLinked={listing.sellerTrust.telegramLinked}
                    activeRecently={listing.sellerTrust.activeRecently}
                    noReports={listing.sellerTrust.noReports}
                    goodReviews={listing.sellerTrust.goodReviews}
                    verified={listing.sellerTrust.verified}
                    online={listing.sellerTrust.online}
                    lastSeen={listing.sellerTrust.lastSeen}
                    rating={listing.sellerTrust.rating}
                    ratingCount={listing.sellerTrust.ratingCount}
                    now={now}
                  />
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </Pressable>
          )}

          {listing.ownerId !== userId && (
            <View className="mx-4 mt-3">
              <SafetyBanner />
            </View>
          )}

          {listing.ownerId !== userId && (
            <View className="mx-4 mt-3">
              <DealSafetyTips />
            </View>
          )}

          {/* Call seller */}
          <Pressable
            onPress={callSeller}
            className="mx-4 mt-4 flex-row items-center rounded-2xl px-4 py-4 active:opacity-80"
            style={{ backgroundColor: BRAND_BLUE + '12' }}
          >
            <Ionicons name="call" size={20} color={BRAND_BLUE} />
            <AppText className="ml-3 font-medium text-base" style={{ color: BRAND_BLUE }}>
              Sotuvchiga qoʻngʻiroq qilish {listing.phone}
            </AppText>
          </Pressable>

          {/* Share listing */}
          <Pressable onPress={onShare} className="mx-4 mt-3 flex-row items-center border-t border-border py-4 active:opacity-70">
            <Ionicons name="share-social-outline" size={20} color={BRAND_BLUE} />
            <AppText className="ml-3 flex-1 font-medium text-base" style={{ color: BRAND_BLUE }}>
              Ushbu eʼlonni yuborish
            </AppText>
            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
          </Pressable>

          {/* Report listing */}
          <Pressable
            onPress={() => setReportOpen(true)}
            className="mx-4 flex-row items-center border-y border-border py-4 active:opacity-70"
          >
            <Ionicons name="flag-outline" size={20} color="#EF4444" />
            <AppText className="ml-3 flex-1 font-medium text-base" style={{ color: '#EF4444' }}>
              Shikoyat qilish
            </AppText>
            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
          </Pressable>

          {/* Seller description */}
          <View className="mt-4 px-4">
            <AppText className="mb-1 font-bold text-lg text-foreground">Sotuvchidan maʼlumot</AppText>
            <AppText className="text-base leading-6 text-foreground">{listing.desc}</AppText>
          </View>

          {/* Bargain card */}
          <View className="mx-4 mt-4 overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: BRAND_BLUE }}>
            <View style={{ backgroundColor: BRAND_BLUE }} className="px-4 py-2.5">
              <AppText className="font-semibold text-base text-white">Sotuvchi bilan savdolashing</AppText>
            </View>
            <View className="bg-surface p-3">
              <View className="mb-3 h-12 flex-row items-center rounded-xl border border-border px-3">
                <TextInput
                  value={msg}
                  onChangeText={setMsg}
                  className="flex-1 text-base text-foreground"
                  style={{ fontFamily: 'Inter-Regular' }}
                />
                <Pressable hitSlop={8} onPress={sendBargain} disabled={sending}>
                  <Ionicons name="send" size={20} color={sending ? '#9ca3af' : BRAND_BLUE} />
                </Pressable>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {QUICK_MSGS.map((q) => (
                  <Pressable
                    key={q}
                    onPress={() => openChat(q)}
                    disabled={sending}
                    className="rounded-full bg-surface-secondary px-4 py-2.5 active:opacity-70"
                  >
                    <AppText className="text-[15px] text-foreground">{q}</AppText>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          {/* Related listings */}
          {related.length > 0 && (
            <>
              <AppText className="mb-3 mt-6 px-4 font-bold text-lg text-foreground">Oʻxshash eʼlonlar</AppText>
              <View className="flex-row flex-wrap justify-between px-4">
                {related.map((l) => (
                  <Pressable
                    key={l._id}
                    onPress={() => router.push({ pathname: '/listing/[id]', params: { id: l._id } })}
                    style={{ width: '48.5%' }}
                    className="mb-4 active:opacity-80"
                  >
                    <View className="items-center justify-center overflow-hidden rounded-xl bg-surface-secondary" style={{ height: 120 }}>
                      {l.photoUrls?.[0] ? (
                        <Image source={{ uri: l.photoUrls[0] }} contentFit="cover" style={{ width: '100%', height: '100%' }} />
                      ) : (
                        <Image source={CATEGORY_IMAGES[l.category]} contentFit="contain" style={{ width: '80%', height: '80%' }} />
                      )}
                    </View>
                    <AppText className="mt-1.5 font-medium text-base" style={{ color: BRAND_BLUE }} numberOfLines={1}>
                      {l.title.split(',')[0]}
                    </AppText>
                    <AppText className="font-bold text-base text-foreground">{l.price}</AppText>
                    <AppText className="text-sm text-muted">{l.city}</AppText>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </ScrollView>

        {/* Sticky bottom bar */}
        <View className="flex-row gap-3 border-t border-border px-4 py-2.5">
          {listing.ownerId !== userId && (
            <Pressable
              onPress={() => openChat()}
              className="h-12 flex-1 flex-row items-center justify-center rounded-xl active:opacity-90"
              style={{ backgroundColor: BRAND_BLUE }}
            >
              <Ionicons name="paper-plane" size={18} color="white" />
              <AppText className="ml-2 font-semibold text-base text-white">Chat</AppText>
            </Pressable>
          )}
          <Pressable
            onPress={callSeller}
            className="h-12 flex-[1.4] flex-row items-center justify-center rounded-xl active:opacity-90"
            style={{ backgroundColor: '#22C55E' }}
          >
            <Ionicons name="call" size={18} color="white" />
            <AppText className="ml-2 font-semibold text-base text-white">Qoʻngʻiroq qilish +998</AppText>
          </Pressable>
        </View>

        {/* Report reason sheet */}
        <Modal visible={reportOpen} transparent animationType="slide" onRequestClose={() => setReportOpen(false)}>
          <Pressable className="flex-1 bg-black/40" onPress={() => setReportOpen(false)} />
          <View className="rounded-t-3xl bg-background px-5 pb-8 pt-5">
            <View className="mb-3 flex-row items-center justify-between">
              <AppText className="font-bold text-xl text-foreground">Shikoyat sababi</AppText>
              <Pressable onPress={() => setReportOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={26} color="#9ca3af" />
              </Pressable>
            </View>
            <AppText className="mb-4 text-base text-muted">
              Nega bu eʼlondan shikoyat qilmoqchisiz?
            </AppText>
            {REPORT_REASONS.map((r) => (
              <Pressable
                key={r}
                onPress={() => submitReport(r)}
                className="flex-row items-center justify-between border-b border-border py-4 active:opacity-60"
              >
                <AppText className="text-lg text-foreground">{r}</AppText>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </Pressable>
            ))}
          </View>
        </Modal>

        <RatingPromptSheet
          open={ratingOpen}
          sellerName={listing.sellerName ?? 'Sotuvchi'}
          stars={stars}
          text={reviewText}
          onStars={setStars}
          onText={setReviewText}
          onClose={() => setRatingOpen(false)}
          onSubmit={submitSellerRating}
        />
      </SafeAreaView>
    </View>
  );
}

type PriceIntel = {
  status: 'below_market' | 'good_price' | 'high_price';
  medianPrice: number;
  sampleSize: number;
  differencePct: number;
  currency: string;
  basis: string;
};

function PriceIntelCard({ intel }: { intel: PriceIntel }) {
  const meta =
    intel.status === 'below_market'
      ? {
          icon: 'trending-down' as const,
          title: 'Bozordan arzon',
          body: 'Bu eʼlon oʼxshash variantlardan pastroq narxda.',
          bg: '#ECFDF5',
          color: '#047857',
        }
      : intel.status === 'high_price'
        ? {
            icon: 'trending-up' as const,
            title: 'Bozordan qimmatroq',
            body: 'Narx oʼxshash eʼlonlar medianasidan yuqoriroq.',
            bg: '#FFF7ED',
            color: '#C2410C',
          }
        : {
            icon: 'checkmark-circle' as const,
            title: 'Yaxshi narx',
            body: 'Narx bozor medianasiga yaqin koʼrinadi.',
            bg: '#EFF6FF',
            color: BRAND_BLUE,
          };
  const diff = intel.differencePct > 0 ? `+${intel.differencePct}%` : `${intel.differencePct}%`;
  return (
    <View className="mt-3 rounded-2xl px-3 py-3" style={{ backgroundColor: meta.bg }}>
      <View className="flex-row items-start">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-white">
          <Ionicons name={meta.icon} size={20} color={meta.color} />
        </View>
        <View className="ml-3 flex-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <AppText className="font-bold text-base" style={{ color: meta.color }}>
              {meta.title}
            </AppText>
            <View className="rounded-full bg-white px-2 py-0.5">
              <AppText className="text-xs font-semibold" style={{ color: meta.color }}>
                {diff}
              </AppText>
            </View>
          </View>
          <AppText className="mt-0.5 text-sm leading-5 text-foreground">{meta.body}</AppText>
          <AppText className="mt-1 text-xs leading-4 text-muted">
            Mediana: {formatIntelPrice(intel.medianPrice, intel.currency)} · {intel.sampleSize} ta eʼlon
          </AppText>
          <AppText className="mt-0.5 text-xs leading-4 text-muted">{intel.basis}</AppText>
        </View>
      </View>
    </View>
  );
}

function formatIntelPrice(value: number, currency: string) {
  const formatted = Math.round(value).toLocaleString('ru-RU');
  return currency === 'usd' ? `${formatted} y.e.` : `${formatted} soʼm`;
}
