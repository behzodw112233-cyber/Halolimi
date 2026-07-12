import { Ionicons } from '@expo/vector-icons';
import { api } from '@halolmia/backend/convex/_generated/api';
import type { Id } from '@halolmia/backend/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/app-text';
import { CATEGORY_IMAGES } from '../../constants/category-images';
import { BRAND_BLUE } from '../../constants/theme';
import { useAuth } from '../../lib/auth';
import { DealerBadge, SafetyBanner, TrustBadges, VerifiedSellerBadge } from '../../components/trust-safety';

/** Row of filled/empty stars for a 0–5 rating. */
function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <View className="flex-row">
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= Math.round(value) ? 'star' : 'star-outline'}
          size={size}
          color="#F59E0B"
        />
      ))}
    </View>
  );
}

const SELLER_REPORT_REASONS = [
  'Firibgarlik gumoni',
  'Notoʻgʻri telefon yoki shaxs',
  'Haqoratli muomala',
  'Oldindan pul soʻrayapti',
  'Boshqa sabab',
];

export default function SellerProfile() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sellerId = id as Id<'users'>;
  const { userId, user } = useAuth();
  const [now] = useState(() => Math.floor(Date.now() / 60_000) * 60_000);

  const profile = useQuery(api.users.sellerProfile, { id: sellerId, now });
  const listings = useQuery(api.listings.byOwner, { ownerId: sellerId }) ?? [];
  const reels = useQuery(api.reels.bySeller, { sellerId, userId: userId ?? undefined, limit: 8 }) ?? [];
  const reviews = useQuery(api.reviews.forSeller, { sellerId }) ?? [];
  const following = useQuery(
    api.follows.isFollowing,
    userId ? { followerId: userId, sellerId } : 'skip'
  );

  const toggleFollow = useMutation(api.follows.toggle);
  const submitReview = useMutation(api.reviews.create);
  const reportSeller = useMutation(api.reports.reportSeller);
  const openThread = useMutation(api.messages.openThread);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [contacting, setContacting] = useState(false);
  const [stars, setStars] = useState(5);
  const [text, setText] = useState('');

  const isSelf = userId === sellerId;
  const active = listings.filter((l) => l.status === 'active');
  const featuredListings = active
    .filter((l) => l.pinned || l.tier || (l.boostedUntil ?? 0) > Date.now())
    .slice(0, 6);
  const dealerFeatured = featuredListings.length > 0 ? featuredListings : active.slice(0, 6);

  const onFollow = () => {
    if (!userId) return router.push('/login');
    toggleFollow({ followerId: userId, sellerId });
  };

  const onSubmitReview = async () => {
    if (!userId) {
      setReviewOpen(false);
      return router.push('/login');
    }
    await submitReview({
      sellerId,
      authorId: userId,
      authorName: user?.name ?? user?.phone ?? 'Anonim',
      rating: stars,
      text: text.trim(),
    });
    setReviewOpen(false);
    setText('');
    setStars(5);
  };

  const submitSellerReport = async (reason: string) => {
    if (!userId) {
      setReportOpen(false);
      return router.push('/login');
    }
    try {
      await reportSeller({
        sellerId,
        sellerName: profile?.name ?? 'Sotuvchi',
        reason,
        reporter: user?.name ?? user?.phone ?? 'Anonim',
      });
      setReportOpen(false);
      Alert.alert('Yuborildi', 'Sotuvchi bo‘yicha shikoyatingiz qabul qilindi.');
    } catch {
      Alert.alert('Xatolik', 'Shikoyat yuborilmadi. Qayta urinib ko‘ring.');
    }
  };

  const openDealerVideo = () => {
    const showcase = profile?.dealerShowcase;
    if (!showcase?.videoUrl) return;
    router.push({
      pathname: '/dealer/[id]',
      params: {
        id: showcase._id,
        video: showcase.videoUrl,
        title: showcase.title,
        dealer: showcase.dealer,
      },
    } as never);
  };

  const callDealer = () => {
    const cleaned = profile?.phone?.replace(/[^\d+]/g, '');
    if (cleaned) Linking.openURL(`tel:${cleaned}`).catch(() => {});
  };

  const openMap = () => {
    if (profile?.dealerMapUrl) Linking.openURL(profile.dealerMapUrl).catch(() => {});
  };

  const messageDealer = async () => {
    if (!userId) return router.push('/login');
    const listing = active[0];
    if (!listing || contacting) return;
    setContacting(true);
    try {
      const threadId = await openThread({ meId: userId, listingId: listing._id });
      router.push({
        pathname: '/chat/[id]',
        params: {
          id: threadId,
          name: profile?.name ?? 'Sotuvchi',
          sellerId,
        },
      });
    } catch {
      Alert.alert('Xatolik', 'Suhbatni ochib boÊ»lmadi.');
    } finally {
      setContacting(false);
    }
  };

  if (profile === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <AppText className="text-muted">Yuklanmoqda...</AppText>
      </View>
    );
  }
  if (profile === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <AppText className="text-muted">Sotuvchi topilmadi</AppText>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View className="h-12 flex-row items-center px-3">
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))} hitSlop={10} className="h-9 w-9 items-center justify-center">
            <Ionicons name="arrow-back" size={24} color={BRAND_BLUE} />
          </Pressable>
          <AppText className="ml-1 flex-1 font-bold text-xl text-foreground" numberOfLines={1}>
            Sotuvchi
          </AppText>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Identity */}
          <View className="items-center px-4 pt-2">
            <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-full" style={{ backgroundColor: BRAND_BLUE + '1A' }}>
              {profile.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} contentFit="cover" style={{ width: '100%', height: '100%' }} />
              ) : (
                <AppText style={{ fontFamily: 'Fredoka-SemiBold', fontSize: 30, color: BRAND_BLUE }}>
                  {profile.name.charAt(0).toUpperCase()}
                </AppText>
              )}
            </View>
            <AppText className="mt-3 font-bold text-2xl text-foreground">{profile.name}</AppText>
            {(profile.verified || profile.isDealer) && (
              <View className="mt-2 flex-row flex-wrap justify-center gap-2">
                {profile.isDealer && <DealerBadge />}
                {profile.verified && <VerifiedSellerBadge />}
              </View>
            )}
            <View className="mt-1 flex-row items-center gap-2">
              <Stars value={profile.rating} />
              <AppText className="text-base text-muted">
                {profile.ratingCount ? `${profile.rating.toFixed(1)} (${profile.ratingCount})` : 'Baho yoʻq'}
              </AppText>
            </View>
            <TrustBadges
              phoneVerified={profile.phoneVerified}
              telegramLinked={profile.telegramLinked}
              activeRecently={profile.activeRecently}
              noReports={profile.noReports}
              goodReviews={profile.goodReviews}
              verified={profile.verified}
              online={profile.online}
              lastSeen={profile.lastSeen}
              rating={profile.rating}
              ratingCount={profile.ratingCount}
              now={now}
            />
            {!!profile.bio && (
              <AppText className="mt-2 text-center text-base leading-6 text-muted">{profile.bio}</AppText>
            )}
            <AppText className="mt-2 text-sm text-muted">{profile.joined} dan beri</AppText>
          </View>

          {/* Stats */}
          <View className="mx-4 mt-4 flex-row rounded-2xl bg-surface-secondary py-3">
            <Stat label="Eʼlonlar" value={profile.activeCount} />
            <Stat label="Sotilgan" value={profile.soldCount} />
            <Stat label="Obunachilar" value={profile.followerCount} />
          </View>

          {profile.isDealer && (
            <View className="mx-4 mt-4 overflow-hidden rounded-2xl bg-surface-secondary">
              <Pressable
                onPress={openDealerVideo}
                disabled={!profile.dealerShowcase?.videoUrl}
                className="h-44 overflow-hidden bg-neutral-950 active:opacity-90"
              >
                {profile.dealerShowcase?.thumbUrl ? (
                  <Image
                    source={{ uri: profile.dealerShowcase.thumbUrl }}
                    contentFit="cover"
                    style={{ width: '100%', height: '100%' }}
                  />
                ) : (
                  <View className="h-full w-full items-center justify-center bg-neutral-900">
                    <Ionicons name="business" size={34} color="#fff" />
                  </View>
                )}
                <View className="absolute left-3 top-3">
                  <DealerBadge />
                </View>
                {profile.dealerShowcase?.videoUrl && (
                  <View className="absolute inset-0 items-center justify-center">
                    <View className="h-14 w-14 items-center justify-center rounded-full bg-black/55">
                      <Ionicons name="play" size={28} color="#fff" style={{ marginLeft: 3 }} />
                    </View>
                  </View>
                )}
                <View className="absolute bottom-0 left-0 right-0 p-3" style={{ backgroundColor: 'rgba(0,0,0,0.58)' }}>
                  <AppText className="font-bold text-lg text-white" numberOfLines={1}>
                    {profile.dealerShowcase?.title ?? 'Rasmiy diler'}
                  </AppText>
                  <AppText className="text-sm text-white/80" numberOfLines={1}>
                    {profile.dealerShowcase?.dealer ?? profile.name}
                  </AppText>
                </View>
              </Pressable>

              <View className="gap-3 p-4">
                <DealerInfoRow icon="location-outline" text={profile.dealerAddress || 'Manzil tez orada'} />
                <DealerInfoRow icon="time-outline" text={profile.dealerHours || 'Ish vaqti tez orada'} />
                {!!profile.dealerMapUrl && (
                  <Pressable onPress={openMap} className="flex-row items-center active:opacity-70">
                    <Ionicons name="map-outline" size={18} color={BRAND_BLUE} />
                    <AppText className="ml-2 font-semibold text-base" style={{ color: BRAND_BLUE }}>
                      Xaritada koÊ»rish
                    </AppText>
                  </Pressable>
                )}
                {!isSelf && (
                  <View className="mt-1 flex-row gap-2">
                    <Pressable
                      onPress={callDealer}
                      className="h-12 flex-1 flex-row items-center justify-center rounded-xl active:opacity-90"
                      style={{ backgroundColor: BRAND_BLUE }}
                    >
                      <Ionicons name="call-outline" size={19} color="#fff" />
                      <AppText className="ml-2 font-semibold text-base text-white">QoÊ»ngÊ»iroq</AppText>
                    </Pressable>
                    <Pressable
                      onPress={messageDealer}
                      disabled={active.length === 0 || contacting}
                      className="h-12 flex-1 flex-row items-center justify-center rounded-xl active:opacity-90"
                      style={{ backgroundColor: active.length === 0 ? '#E5E7EB' : '#111827' }}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={19} color={active.length === 0 ? '#9CA3AF' : '#fff'} />
                      <AppText className="ml-2 font-semibold text-base" style={{ color: active.length === 0 ? '#9CA3AF' : '#fff' }}>
                        {contacting ? 'Ochilyapti...' : 'Chat'}
                      </AppText>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Follow */}
          {!isSelf && (
            <>
              <View className="mx-4 mt-3">
                <SafetyBanner compact />
              </View>
              <View className="mx-4 mt-3 flex-row gap-2">
                <Pressable
                  onPress={onFollow}
                  className="h-12 flex-1 flex-row items-center justify-center rounded-xl active:opacity-90"
                  style={{ backgroundColor: following ? BRAND_BLUE + '1A' : BRAND_BLUE }}
                >
                  <Ionicons
                    name={following ? 'checkmark' : 'person-add-outline'}
                    size={18}
                    color={following ? BRAND_BLUE : '#fff'}
                  />
                  <AppText className="ml-2 font-semibold text-base" style={{ color: following ? BRAND_BLUE : '#fff' }}>
                    {following ? 'Obuna boʻlgansiz' : 'Obuna boʻlish'}
                  </AppText>
                </Pressable>
                <Pressable
                  onPress={() => setReportOpen(true)}
                  className="h-12 w-12 items-center justify-center rounded-xl active:opacity-80"
                  style={{ backgroundColor: '#FEE2E2' }}
                >
                  <Ionicons name="flag-outline" size={22} color="#DC2626" />
                </Pressable>
              </View>
            </>
          )}

          {/* Their videos */}
          {reels.length > 0 && (
            <View className="mt-6">
              <View className="mb-2 flex-row items-center justify-between px-4">
                <AppText className="font-bold text-lg text-foreground">Videolari</AppText>
                <Pressable
                  onPress={() => router.push({ pathname: '/reels', params: { start: reels[0]._id, sellerId: id } } as never)}
                  hitSlop={8}
                  className="flex-row items-center active:opacity-70"
                >
                  <AppText className="font-medium text-base" style={{ color: BRAND_BLUE }}>
                    {"Ko'rish"}
                  </AppText>
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
                    onPress={() => router.push({ pathname: '/reels', params: { start: r._id, sellerId: id } } as never)}
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

          {profile.isDealer && dealerFeatured.length > 0 && (
            <View className="mt-6">
              <View className="mb-2 flex-row items-center justify-between px-4">
                <AppText className="font-bold text-lg text-foreground">Diler tanlaganlari</AppText>
                <DealerBadge />
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
              >
                {dealerFeatured.map((l) => (
                  <Pressable
                    key={l._id}
                    onPress={() => router.push({ pathname: '/listing/[id]', params: { id: l._id } })}
                    className="active:opacity-85"
                    style={{ width: 154 }}
                  >
                    <View className="items-center justify-center overflow-hidden rounded-xl bg-surface-secondary" style={{ height: 108 }}>
                      {l.photoUrls?.[0] ? (
                        <Image source={{ uri: l.photoUrls[0] }} contentFit="cover" style={{ width: '100%', height: '100%' }} />
                      ) : (
                        <Image source={CATEGORY_IMAGES[l.category]} contentFit="contain" style={{ width: '80%', height: '80%' }} />
                      )}
                    </View>
                    <AppText className="mt-1.5 font-bold text-base text-foreground" numberOfLines={1}>
                      {l.price}
                    </AppText>
                    <AppText className="text-sm text-muted" numberOfLines={1}>
                      {l.title.split(',')[0]}
                    </AppText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Their listings */}
          <AppText className="mb-2 mt-6 px-4 font-bold text-lg text-foreground">Eʼlonlari</AppText>
          {active.length === 0 ? (
            <AppText className="px-4 text-base text-muted">Faol eʼlon yoʻq.</AppText>
          ) : (
            <View className="flex-row flex-wrap justify-between px-4">
              {active.map((l) => (
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
                  <AppText className="mt-1.5 font-bold text-base text-foreground" numberOfLines={1}>{l.price}</AppText>
                  <AppText className="text-sm text-muted" numberOfLines={1}>{l.title.split(',')[0]}</AppText>
                </Pressable>
              ))}
            </View>
          )}

          {/* Reviews */}
          <View className="mb-2 mt-4 flex-row items-center justify-between px-4">
            <AppText className="font-bold text-lg text-foreground">Sharhlar ({reviews.length})</AppText>
            {!isSelf && (
              <Pressable onPress={() => setReviewOpen(true)} hitSlop={8} className="flex-row items-center active:opacity-70">
                <Ionicons name="create-outline" size={18} color={BRAND_BLUE} />
                <AppText className="ml-1 font-medium text-base" style={{ color: BRAND_BLUE }}>Baholash</AppText>
              </Pressable>
            )}
          </View>
          {reviews.length === 0 ? (
            <AppText className="px-4 text-base text-muted">Hali sharh yoʻq. Birinchi boʻlib baholang.</AppText>
          ) : (
            reviews.map((r) => (
              <View key={r._id} className="mx-4 mb-3 rounded-2xl bg-surface-secondary p-3">
                <View className="flex-row items-center justify-between">
                  <AppText className="font-semibold text-base text-foreground">{r.authorName}</AppText>
                  <Stars value={r.rating} size={14} />
                </View>
                {!!r.text && <AppText className="mt-1 text-base leading-6 text-foreground">{r.text}</AppText>}
              </View>
            ))
          )}
        </ScrollView>

        {/* Write review sheet */}
        <Modal visible={reviewOpen} transparent animationType="slide" onRequestClose={() => setReviewOpen(false)}>
          <Pressable className="flex-1 bg-black/40" onPress={() => setReviewOpen(false)} />
          <View className="rounded-t-3xl bg-background px-5 pb-8 pt-5">
            <View className="mb-4 flex-row items-center justify-between">
              <AppText className="font-bold text-xl text-foreground">Sotuvchini baholang</AppText>
              <Pressable onPress={() => setReviewOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={26} color="#9ca3af" />
              </Pressable>
            </View>
            <View className="mb-4 flex-row justify-center gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Pressable key={i} onPress={() => setStars(i)} hitSlop={6}>
                  <Ionicons name={i <= stars ? 'star' : 'star-outline'} size={38} color="#F59E0B" />
                </Pressable>
              ))}
            </View>
            <TextInput
              value={text}
              onChangeText={setText}
              multiline
              placeholder="Fikringizni yozing (ixtiyoriy)"
              placeholderTextColor="#9ca3af"
              className="mb-4 rounded-xl border border-border p-4 text-base text-foreground"
              style={{ minHeight: 90, textAlignVertical: 'top', fontFamily: 'Inter-Regular' }}
            />
            <Pressable
              onPress={onSubmitReview}
              className="h-14 items-center justify-center rounded-xl active:opacity-90"
              style={{ backgroundColor: BRAND_BLUE }}
            >
              <AppText className="font-semibold text-base text-white">Yuborish</AppText>
            </Pressable>
          </View>
        </Modal>

        {/* Report seller sheet */}
        <Modal visible={reportOpen} transparent animationType="slide" onRequestClose={() => setReportOpen(false)}>
          <Pressable className="flex-1 bg-black/40" onPress={() => setReportOpen(false)} />
          <View className="rounded-t-3xl bg-background px-5 pb-8 pt-5">
            <View className="mb-3 flex-row items-center justify-between">
              <AppText className="font-bold text-xl text-foreground">Sotuvchidan shikoyat</AppText>
              <Pressable onPress={() => setReportOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={26} color="#9ca3af" />
              </Pressable>
            </View>
            <AppText className="mb-4 text-base text-muted">
              Nima sababdan bu sotuvchini tekshirishimiz kerak?
            </AppText>
            {SELLER_REPORT_REASONS.map((r) => (
              <Pressable
                key={r}
                onPress={() => submitSellerReport(r)}
                className="flex-row items-center justify-between border-b border-border py-4 active:opacity-60"
              >
                <AppText className="text-lg text-foreground">{r}</AppText>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </Pressable>
            ))}
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-1 items-center">
      <AppText className="font-bold text-xl text-foreground">{value}</AppText>
      <AppText className="text-sm text-muted">{label}</AppText>
    </View>
  );
}

function DealerInfoRow({
  icon,
  text,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  text: string;
}) {
  return (
    <View className="flex-row items-start">
      <Ionicons name={icon} size={18} color="#6B7280" style={{ marginTop: 2 }} />
      <AppText className="ml-2 flex-1 text-base leading-6 text-foreground">{text}</AppText>
    </View>
  );
}
