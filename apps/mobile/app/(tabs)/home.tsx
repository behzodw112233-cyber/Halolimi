import { api } from '@halolmia/backend/convex/_generated/api';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Linking, ScrollView, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/app-text';
import { Logo } from '../../components/logo';
import { ListingCard } from '../../components/listing-card';
import { CATEGORY_IMAGES } from '../../constants/category-images';
import { PROMOS, PROMO_IMAGES } from '../../constants/promos';
import { BRAND_BLUE } from '../../constants/theme';
import { useNotifications } from '../../lib/notifications';
import { useSaved } from '../../lib/saved';

export default function Home() {
  const router = useRouter();
  const listings = useQuery(api.listings.listActive, {}) ?? [];
  const ads = useQuery(api.ads.byPlacement, { placement: 'app' }) ?? [];
  const categories = useQuery(api.categories.list) ?? [];
  const homeCategories = categories.slice(0, 5);
  const { hasUnread } = useNotifications();
  const { isSaved, toggleSave } = useSaved();

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={['top']} className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {/* Header */}
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

          {/* Search */}
          <Pressable
            onPress={() => router.push('/sell')}
            className="mx-4 mb-4 h-12 flex-row items-center rounded-xl bg-surface-secondary px-4 active:opacity-80"
          >
            <Ionicons name="search" size={20} color="#9ca3af" />
            <AppText className="ml-3 text-base text-muted">Hayvon qidirish</AppText>
          </Pressable>

          {/* Category shortcuts */}
          <View className="flex-row flex-wrap justify-between px-4">
            {/* Sotish */}
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
                onPress={() => router.push('/sell')}
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

          {/* Tezroq toping */}
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
                <Pressable key={q.id} className="active:opacity-80">
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
                    {/* Bottom scrim so the title stays readable over any image */}
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

          {/* Listings */}
          <View className="mt-6 px-4">
            <AppText className="font-bold text-lg text-foreground">
              {listings.length} ta eʼlon
            </AppText>
            <Pressable className="mt-1 flex-row items-center active:opacity-70">
              <AppText className="font-semibold text-base" style={{ color: BRAND_BLUE }}>
                butun Oʻzbekiston boʻylab
              </AppText>
              <Ionicons name="chevron-down" size={18} color={BRAND_BLUE} />
            </Pressable>
          </View>

          {/* Sponsored ad (from Convex — managed in admin Ads panel) */}
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

          <View className="mt-3 gap-3 px-4">
            {listings.map((listing) => (
              <ListingCard
                key={listing._id}
                listing={{
                  ...listing,
                  promoted: !!listing.boostedUntil && listing.boostedUntil > Date.now(),
                }}
                saved={isSaved(listing._id)}
                onToggleSave={() => {
                  if (!toggleSave(listing._id)) router.push('/login');
                }}
                onPress={() => router.push({ pathname: '/listing/[id]', params: { id: listing._id } })}
              />
            ))}
          </View>

          {/* Promo banner */}
          <Pressable className="mx-4 mt-5 active:opacity-90">
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
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
