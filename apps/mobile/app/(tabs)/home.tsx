import { api } from '@halolmia/backend/convex/_generated/api';
import type { Id } from '@halolmia/backend/convex/_generated/dataModel';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Linking, Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/app-text';
import { ListingCard } from '../../components/listing-card';
import { Logo } from '../../components/logo';
import { CATEGORY_IMAGES } from '../../constants/category-images';
import { PROMOS, PROMO_IMAGES } from '../../constants/promos';
import { BRAND_BLUE } from '../../constants/theme';
import { useAuth } from '../../lib/auth';
import { useNotifications } from '../../lib/notifications';
import { useRecentlyViewed } from '../../lib/recently-viewed';
import { useSaved } from '../../lib/saved';

/** Each "Tezroq toping" promo → the search filter it opens. */
const PROMO_FILTERS: Record<string, Record<string, string>> = {
  qurbonlik: { category: 'sheep' }, // qurbonlik hayvonlari = qoʻy/echki
  naslli: { category: 'cattle' }, // naslli mollar = zotli qoramol
  arzon: { priceMax: '5000000' }, // arzon = 5 mln soʻmgacha
  yaqin: { city: 'Toshkent' }, // yaqin atrofda (hozircha Toshkent)
};

/** One official-dealer showcase, resolved by api.dealers.list. */
type DealerAdData = {
  _id: string;
  title: string;
  dealer?: string | null;
  videoUrl?: string | null;
  thumbUrl?: string | null;
  sellerId?: string | null;
  sellerName?: string | null;
  avatarUrl?: string | null;
};

/**
 * A sponsored, Instagram-style dealer post rendered inline in the feed. Tapping
 * the media (or "Videoni koʻrish") plays the video full-screen; "Profil" opens
 * the linked seller.
 */
function DealerAd({ d }: { d: DealerAdData }) {
  const router = useRouter();
  const name = d.sellerName ?? d.dealer ?? 'Rasmiy diler';
  const openVideo = () =>
    router.push({
      pathname: '/dealer/[id]',
      params: { id: d._id, video: d.videoUrl ?? '', title: d.title, dealer: name },
    } as unknown as Href);

  return (
    <View className="mx-4 mb-3 overflow-hidden rounded-2xl bg-surface">
      {/* Sponsored header — seller identity */}
      <View className="flex-row items-center px-3 py-2.5">
        {d.avatarUrl ? (
          <Image source={{ uri: d.avatarUrl }} style={{ width: 38, height: 38, borderRadius: 19 }} />
        ) : (
          <View
            className="items-center justify-center rounded-full"
            style={{ width: 38, height: 38, backgroundColor: BRAND_BLUE + '18' }}
          >
            <Ionicons name="storefront" size={19} color={BRAND_BLUE} />
          </View>
        )}
        <View className="ml-2.5 flex-1">
          <View className="flex-row items-center">
            <AppText className="font-semibold text-[15px] text-foreground" numberOfLines={1}>
              {name}
            </AppText>
            <Ionicons name="checkmark-circle" size={15} color={BRAND_BLUE} style={{ marginLeft: 4 }} />
          </View>
          <AppText className="text-xs text-muted">Homiylik · Rasmiy diler</AppText>
        </View>
      </View>

      {/* Media — video poster with play overlay */}
      <Pressable onPress={openVideo} className="active:opacity-95">
        <View className="bg-black" style={{ width: '100%', aspectRatio: 16 / 10 }}>
          {d.thumbUrl ? (
            <Image
              source={{ uri: d.thumbUrl }}
              contentFit="cover"
              style={{ position: 'absolute', width: '100%', height: '100%' }}
            />
          ) : null}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.55)']}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 72 }}
          />
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} className="items-center justify-center">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-black/45">
              <Ionicons name="play" size={28} color="#fff" style={{ marginLeft: 3 }} />
            </View>
          </View>
          <AppText
            className="absolute bottom-2.5 left-3 right-3 font-semibold text-[15px] leading-5 text-white"
            numberOfLines={2}
          >
            {d.title}
          </AppText>
        </View>
      </Pressable>

      {/* CTA row */}
      <View className="flex-row items-center px-3 py-2.5">
        <Pressable onPress={openVideo} className="flex-row items-center active:opacity-70">
          <Ionicons name="play-circle" size={20} color={BRAND_BLUE} />
          <AppText className="ml-1.5 font-medium text-sm text-foreground">Videoni koʻrish</AppText>
        </Pressable>
        <View className="flex-1" />
        {d.sellerId ? (
          <Pressable
            onPress={() => router.push({ pathname: '/seller/[id]', params: { id: d.sellerId as string } })}
            className="rounded-full px-4 py-1.5 active:opacity-80"
            style={{ backgroundColor: BRAND_BLUE }}
          >
            <AppText className="font-semibold text-sm text-white">Profil</AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default function Home() {
  const router = useRouter();
  const { userId } = useAuth();
  const openThread = useMutation(api.messages.openThread);

  // Quick "ask the price" from a card → open (or reuse) the chat with the seller.
  const askPrice = async (l: { _id: Id<'listings'>; ownerId?: Id<'users'>; sellerName?: string }) => {
    if (!userId) return router.push('/login');
    if (!l.ownerId || l.ownerId === userId) return;
    try {
      const threadId = await openThread({ meId: userId, listingId: l._id });
      router.push({
        pathname: '/chat/[id]',
        params: { id: threadId, name: l.sellerName ?? 'Sotuvchi', sellerId: l.ownerId },
      });
    } catch {
      /* ignore — user can retry from the listing page */
    }
  };
  const [feedNow] = useState(() => Math.floor(Date.now() / 60_000) * 60_000);
  const {
    results: listings,
    status: feedStatus,
    loadMore,
  } = usePaginatedQuery(api.listings.listActivePage, { now: feedNow }, { initialNumItems: 12 });
  const ads = useQuery(api.ads.byPlacement, { placement: 'app' }) ?? [];
  const categories = useQuery(api.categories.list) ?? [];
  const dealers = useQuery(api.dealers.list) ?? [];
  const homeCategories = categories.slice(0, 5);
  const { hasUnread } = useNotifications();
  const { isSaved, toggleSave, savedIds } = useSaved();
  const recentIds = useRecentlyViewed();
  const hasRecommendationSignals = recentIds.length > 0 || savedIds.length > 0;
  const recommendations =
    useQuery(
      api.listings.recommendations,
      hasRecommendationSignals
        ? {
            recentIds: recentIds as Id<'listings'>[],
            savedIds,
            limit: 8,
            now: feedNow,
          }
        : 'skip'
    ) ?? [];

  const loadMoreListings = () => {
    if (feedStatus === 'CanLoadMore') loadMore(12);
  };

  // Interleave dealer showcases into the feed as sponsored posts: one dealer ad
  // after every 4 listings, cycling through the active dealers.
  type FeedRow =
    | { kind: 'listing'; listing: (typeof listings)[number] }
    | { kind: 'dealer'; dealer: (typeof dealers)[number]; k: string };
  const feedData = useMemo<FeedRow[]>(() => {
    const rows: FeedRow[] = [];
    let di = 0;
    listings.forEach((l, i) => {
      rows.push({ kind: 'listing', listing: l });
      if (dealers.length && (i + 1) % 4 === 0) {
        const d = dealers[di % dealers.length];
        rows.push({ kind: 'dealer', dealer: d, k: `d_${d._id}_${i}` });
        di++;
      }
    });
    return rows;
  }, [listings, dealers]);

  const [safetyOpen, setSafetyOpen] = useState(false);

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={['top']} className="flex-1">
        <FlatList
          data={feedData}
          keyExtractor={(row) => (row.kind === 'listing' ? row.listing._id : row.k)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          onEndReached={loadMoreListings}
          onEndReachedThreshold={0.7}
          // Smoother scrolling: detach off-screen rows and render in smaller batches.
          removeClippedSubviews
          initialNumToRender={6}
          maxToRenderPerBatch={5}
          updateCellsBatchingPeriod={40}
          windowSize={9}
          ListHeaderComponent={
            <>
              <View className="flex-row items-center justify-between px-4 pb-3 pt-1">
                <Logo className="text-[#0F172A]" size={22} />
                <Pressable hitSlop={8} onPress={() => router.push('/notifications')}>
                  <Ionicons name="notifications-outline" size={26} color="#0F172A" />
                  {hasUnread && (
                    <View
                      style={{
                        position: 'absolute',
                        top: -1,
                        right: -1,
                        width: 11,
                        height: 11,
                        borderRadius: 6,
                        backgroundColor: '#EF4444',
                        borderWidth: 1.5,
                        borderColor: '#fff',
                      }}
                    />
                  )}
                </Pressable>
              </View>

              <Pressable
                onPress={() => router.push('/search' as never)}
                className="mx-4 mb-4 h-12 flex-row items-center rounded-xl bg-surface-secondary px-4 active:opacity-80"
              >
                <Ionicons name="search" size={20} color="#9ca3af" />
                <AppText className="ml-3 text-base text-muted">Hayvon qidirish</AppText>
              </Pressable>

              <View className="flex-row flex-wrap justify-between px-4">
                <Pressable
                  onPress={() => router.push('/sell')}
                  style={{ width: '31.5%', height: 92 }}
                  className="mb-2.5 items-center justify-center rounded-2xl active:opacity-80"
                >
                  <View
                    className="h-full w-full items-center justify-center rounded-2xl"
                    style={{ backgroundColor: BRAND_BLUE }}
                  >
                    <Ionicons name="add" size={26} color="white" />
                    <AppText className="mt-1 font-semibold text-sm text-white">
                      Sotish
                    </AppText>
                  </View>
                </Pressable>

                {homeCategories.map((c) => (
                  <Pressable
                    key={c._id}
                    onPress={() =>
                      router.push({ pathname: '/search', params: { category: c.slug } } as never)
                    }
                    style={{ width: '31.5%', height: 92 }}
                    className="mb-2.5 overflow-hidden rounded-2xl bg-surface-secondary active:opacity-80"
                  >
                    <AppText className="px-2.5 pt-2 text-xs font-medium leading-4 text-foreground">
                      {c.name}
                    </AppText>
                    {CATEGORY_IMAGES[c.slug] && (
                      <Image
                        source={CATEGORY_IMAGES[c.slug]}
                        contentFit="contain"
                        style={{ position: 'absolute', right: 2, bottom: 2, width: '62%', height: '62%' }}
                      />
                    )}
                  </Pressable>
                ))}
              </View>

              <AppText className="mb-3 mt-3 px-4 font-bold text-lg text-foreground">
                Tezroq toping
              </AppText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
              >
                {PROMOS.map((q) => {
                  const image = PROMO_IMAGES[q.id];
                  return (
                    <Pressable
                      key={q.id}
                      className="active:opacity-80"
                      onPress={() =>
                        router.push({ pathname: '/search', params: PROMO_FILTERS[q.id] ?? { q: q.title } })
                      }
                    >
                      <View
                        className="overflow-hidden"
                        style={{ width: 150, height: 90, borderRadius: 16 }}
                      >
                        {image ? (
                          <Image
                            source={image}
                            contentFit="cover"
                            style={{ position: 'absolute', width: '100%', height: '100%' }}
                          />
                        ) : (
                          <LinearGradient
                            colors={q.gradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{ position: 'absolute', width: '100%', height: '100%' }}
                          />
                        )}
                        <LinearGradient
                          colors={['transparent', 'rgba(0,0,0,0.55)']}
                          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 48 }}
                        />
                        {!image && (
                          <AppText style={{ position: 'absolute', top: 8, left: 12, fontSize: 22 }}>
                            {q.emoji}
                          </AppText>
                        )}
                        <AppText
                          className="absolute bottom-2 left-3 right-3 font-semibold text-[13px] leading-4 text-white"
                          numberOfLines={2}
                        >
                          {q.title}
                        </AppText>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View className="mt-6 px-4">
                <AppText className="font-bold text-lg text-foreground">
                  {feedStatus === 'LoadingFirstPage'
                    ? 'Eʼlonlar yuklanmoqda...'
                    : `${listings.length} ta eʼlon yuklandi`}
                </AppText>
                <Pressable
                  onPress={() => router.push('/search' as never)}
                  className="mt-1 flex-row items-center active:opacity-70"
                >
                  <AppText className="font-semibold text-base" style={{ color: BRAND_BLUE }}>
                    {"butun O'zbekiston bo'ylab"}
                  </AppText>
                  <Ionicons name="chevron-down" size={18} color={BRAND_BLUE} />
                </Pressable>
              </View>

              {ads.length > 0 && (
                <Pressable
                  className="mx-4 mt-3 overflow-hidden rounded-2xl active:opacity-90"
                  onPress={() => Linking.openURL(ads[0].url).catch(() => {})}
                >
                  <LinearGradient
                    colors={[ads[0].grad[0], ads[0].grad[1] ?? ads[0].grad[0]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ padding: 16, flexDirection: 'row', alignItems: 'center' }}
                  >
                    <AppText className="text-4xl">{ads[0].emoji}</AppText>
                    <View className="ml-3 flex-1">
                      <View className="mb-0.5 self-start rounded-full bg-black/20 px-2 py-0.5">
                        <AppText className="text-[10px] font-medium uppercase tracking-wide text-white">
                          Reklama · {ads[0].advertiser}
                        </AppText>
                      </View>
                      <AppText className="font-bold text-base text-white">{ads[0].headline}</AppText>
                      <AppText className="text-xs leading-4 text-white/85">{ads[0].body}</AppText>
                    </View>
                  </LinearGradient>
                  <View className="flex-row items-center justify-between bg-black/10 px-4 py-2">
                    <AppText className="text-xs text-white/80">Homiylik asosida</AppText>
                    <View className="rounded-full bg-white px-3 py-1">
                      <AppText className="text-xs font-semibold" style={{ color: ads[0].grad[0] }}>
                        {ads[0].cta}
                      </AppText>
                    </View>
                  </View>
                </Pressable>
              )}

              {recommendations.length > 0 && (
                <View className="mt-5">
                  <View className="mb-3 flex-row items-end justify-between px-4">
                    <View className="flex-1 pr-3">
                      <AppText className="font-bold text-lg text-foreground">Sizga mos</AppText>
                      <AppText className="mt-0.5 text-sm text-muted" numberOfLines={1}>
                        {"Ko'rgan va saqlagan e'lonlaringizga yaqin"}
                      </AppText>
                    </View>
                    <Ionicons name="sparkles-outline" size={20} color={BRAND_BLUE} />
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
                  >
                    {recommendations.map((listing) => {
                      const photo = listing.photoUrls?.[0];
                      const photoCount = listing.photoUrls?.length ?? 0;
                      const image = photo ? { uri: photo } : CATEGORY_IMAGES[listing.category];
                      return (
                        <Pressable
                          key={listing._id}
                          onPress={() =>
                            router.push({ pathname: '/listing/[id]', params: { id: listing._id } })
                          }
                          className="overflow-hidden rounded-2xl bg-surface active:opacity-90"
                          style={{ width: 178 }}
                        >
                          <View className="bg-surface-secondary" style={{ height: 112 }}>
                            <Image
                              source={image}
                              contentFit={photo ? 'cover' : 'contain'}
                              style={
                                photo
                                  ? { width: '100%', height: '100%' }
                                  : { width: '84%', height: '84%', alignSelf: 'center', marginTop: 9 }
                              }
                            />
                            <Pressable
                              onPress={() => {
                                if (!toggleSave(listing._id)) router.push('/login');
                              }}
                              hitSlop={8}
                              className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-white/95"
                            >
                              <Ionicons
                                name={isSaved(listing._id) ? 'heart' : 'heart-outline'}
                                size={19}
                                color={isSaved(listing._id) ? '#EF4444' : BRAND_BLUE}
                              />
                            </Pressable>
                            {photoCount > 0 && (
                              <View className="absolute bottom-2 left-2 flex-row items-center rounded-md bg-black/60 px-1.5 py-0.5">
                                <Ionicons name="camera" size={12} color="white" />
                                <AppText className="ml-1 text-xs text-white">{photoCount}</AppText>
                              </View>
                            )}
                          </View>
                          <View className="p-3">
                            <AppText className="font-bold text-base text-foreground" numberOfLines={1}>
                              {listing.price}
                            </AppText>
                            <AppText className="mt-0.5 text-sm text-foreground" numberOfLines={1}>
                              {listing.title}
                            </AppText>
                            <View className="mt-2 flex-row items-center">
                              <Ionicons name="location-outline" size={14} color="#EF4444" />
                              <AppText className="ml-1 flex-1 text-xs text-muted" numberOfLines={1}>
                                {listing.city}
                              </AppText>
                            </View>
                          </View>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              <View className="mt-3" />
            </>
          }
          renderItem={({ item: row }) => {
            if (row.kind === 'dealer') {
              return <DealerAd d={row.dealer as unknown as DealerAdData} />;
            }
            const listing = row.listing;
            return (
              <View className="px-4 pb-3">
                <ListingCard
                  listing={{
                    ...listing,
                    promoted: !!listing.boostedUntil && listing.boostedUntil > feedNow,
                  }}
                  saved={isSaved(listing._id)}
                  onToggleSave={() => {
                    if (!toggleSave(listing._id)) router.push('/login');
                  }}
                  onMessage={
                    listing.ownerId && listing.ownerId !== userId
                      ? () => askPrice(listing)
                      : undefined
                  }
                  onPress={() => router.push({ pathname: '/listing/[id]', params: { id: listing._id } })}
                />
              </View>
            );
          }}
          ListFooterComponent={
            <>
              {feedStatus === 'LoadingMore' && (
                <View className="px-4 py-4">
                  <AppText className="text-center text-sm text-muted">Yuklanmoqda...</AppText>
                </View>
              )}
              <Pressable className="mx-4 mt-2 active:opacity-90" onPress={() => setSafetyOpen(true)}>
                <LinearGradient
                  colors={['#0A6CFF', '#3B82F6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center' }}
                >
                  <Ionicons name="shield-checkmark" size={26} color="white" />
                  <AppText className="ml-3 flex-1 font-semibold text-[15px] leading-5 text-white">
                    Ishonchli sotuvchilardan xavfsiz xarid qiling
                  </AppText>
                  <Ionicons name="chevron-forward" size={20} color="white" />
                </LinearGradient>
              </Pressable>
            </>
          }
        />

        {/* Safe-buying tips — opened from the trust banner */}
        <Modal visible={safetyOpen} transparent animationType="slide" onRequestClose={() => setSafetyOpen(false)}>
          <Pressable className="flex-1 bg-black/40" onPress={() => setSafetyOpen(false)} />
          <View className="rounded-t-3xl bg-background px-5 pb-8 pt-5" style={{ maxHeight: '85%' }}>
            <View className="mb-1 flex-row items-center">
              <Ionicons name="shield-checkmark" size={26} color={BRAND_BLUE} />
              <AppText className="ml-2 flex-1 font-bold text-xl text-foreground">Xavfsiz xarid qilish</AppText>
              <Pressable onPress={() => setSafetyOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={26} color="#9ca3af" />
              </Pressable>
            </View>
            <AppText className="mb-4 text-base text-muted">
              Firibgarlikdan saqlanish uchun ushbu oddiy qoidalarga amal qiling:
            </AppText>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { icon: 'eye', title: 'Hayvonni oʻz koʻzingiz bilan koʻring', body: 'Pul toʻlashdan oldin hayvonni koʻrib, tekshirib oling.' },
                { icon: 'cash-outline', title: 'Oldindan pul yubormang', body: 'Faqat hayvonni qoʻlingizga olgach toʻlov qiling. Old toʻlov — firibgarlikning asosiy belgisi.' },
                { icon: 'document-text-outline', title: 'Hujjatlarni soʻrang', body: 'Naslli hayvon boʻlsa, veterinariya va nasl hujjatlarini tekshiring.' },
                { icon: 'call-outline', title: 'Sotuvchi bilan gaplashing', body: 'Telefon yoki chat orqali bogʻlanib, barcha savollaringizni bering.' },
                { icon: 'location-outline', title: 'Xavfsiz joyda uchrashing', body: 'Odamlar koʻp, ochiq joyda uchrashuvni belgilang.' },
                { icon: 'flag-outline', title: 'Shubha tugʻilsa — shikoyat qiling', body: 'Firibgarlikka duch kelsangiz, eʼlondagi «Shikoyat qilish» tugmasini bosing.' },
              ].map((t) => (
                <View key={t.title} className="mb-3 flex-row items-start rounded-2xl bg-surface p-3.5">
                  <View className="mr-3 h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: BRAND_BLUE + '14' }}>
                    <Ionicons name={t.icon as keyof typeof Ionicons.glyphMap} size={20} color={BRAND_BLUE} />
                  </View>
                  <View className="flex-1">
                    <AppText className="font-semibold text-base text-foreground">{t.title}</AppText>
                    <AppText className="mt-0.5 text-sm leading-5 text-muted">{t.body}</AppText>
                  </View>
                </View>
              ))}
            </ScrollView>
            <Pressable
              onPress={() => setSafetyOpen(false)}
              className="mt-2 h-13 items-center justify-center rounded-2xl py-4 active:opacity-90"
              style={{ backgroundColor: BRAND_BLUE }}
            >
              <AppText className="font-semibold text-base text-white">Tushunarli</AppText>
            </Pressable>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}
