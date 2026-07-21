import { Ionicons } from '@expo/vector-icons';
import { api } from '@halolmia/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/app-text';
import { CATEGORY_IMAGES } from '../../constants/category-images';
import { BRAND_BLUE } from '../../constants/theme';
import { useAuth } from '../../lib/auth';
import { runtime } from '../../lib/runtime';

const TABS = [
  { key: 'listings', label: "E'lonlar", icon: 'heart' },
  { key: 'videos', label: 'Videolar', icon: 'play-circle' },
  { key: 'searches', label: 'Qidiruvlar', icon: 'search' },
] as const;

export default function Saved() {
  const router = useRouter();
  const { userId } = useAuth();
  const visibleTabs = runtime.supportsReels ? TABS : TABS.filter((t) => t.key !== 'videos');
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('listings');

  const saved = useQuery(api.saved.list, userId ? { userId } : 'skip');
  const likedReels = useQuery(api.reels.likedByUser, userId ? { userId } : 'skip');
  const listingCount = saved?.length ?? 0;
  const videoCount = likedReels?.length ?? 0;
  const isLoading = userId && (saved === undefined || likedReels === undefined);
  const hasSaved = tab === 'listings' && !!saved && saved.length > 0;
  const hasVideos = tab === 'videos' && !!likedReels && likedReels.length > 0;

  if (!userId) {
    return (
      <View className="flex-1" style={{ backgroundColor: '#EEF4FA' }}>
        <ScreenGlow />
        <SafeAreaView className="flex-1" edges={['top']}>
          <View className="px-4 pb-3 pt-2">
            <AppText className="font-display text-3xl text-[#0F172A]">Saqlangan</AppText>
          </View>
          <View className="px-4 pt-5">
            <GlassPanel className="items-center px-5 py-7">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: BRAND_BLUE + '1A' }}>
                <Ionicons name="heart-outline" size={34} color={BRAND_BLUE} />
              </View>
              <AppText className="mb-2 text-center font-bold text-xl text-foreground">
                Saqlanganlar uchun kiring
              </AppText>
              <AppText className="mb-6 text-center text-base leading-6 text-muted">
                Yoqtirgan e'lon va videolaringiz shu yerda yig'iladi.
              </AppText>
              <Pressable
                onPress={() => router.push('/login')}
                className="h-12 items-center justify-center rounded-2xl px-8 active:opacity-90"
                style={{ backgroundColor: BRAND_BLUE }}
              >
                <AppText className="font-semibold text-base text-white">Kirish</AppText>
              </Pressable>
            </GlassPanel>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: '#EEF4FA' }}>
      <ScreenGlow />
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="px-4 pb-3 pt-2">
          <View className="flex-row items-center justify-between">
            <View>
              <AppText className="text-xs font-semibold uppercase tracking-[1.4px] text-[#64748B]">Kolleksiya</AppText>
              <AppText className="font-display text-3xl text-[#0F172A]">Saqlangan</AppText>
            </View>
            <View className="h-11 min-w-11 items-center justify-center rounded-full border border-white/70 bg-white/60 px-3">
              <Ionicons name="heart-outline" size={21} color={BRAND_BLUE} />
            </View>
          </View>

          <GlassPanel className="mt-3 p-4">
            <View className="absolute -right-10 -top-10 h-28 w-28 rounded-full" style={{ backgroundColor: BRAND_BLUE + '18' }} />
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <AppText className="font-bold text-lg text-[#0F172A]">Yoqtirganlaringiz</AppText>
                <AppText className="mt-1 text-sm leading-5 text-[#64748B]">
                  E'lonlar, videolar va tez topiladigan qidiruvlar bitta joyda.
                </AppText>
              </View>
              <Stat label="e'lon" value={listingCount} />
              <View className="ml-2">
                <Stat label="video" value={videoCount} active={videoCount > 0} />
              </View>
            </View>
          </GlassPanel>

          <View className="mt-3 flex-row rounded-[24px] border border-white/70 bg-white/55 p-1.5">
            {visibleTabs.map((t) => {
              const active = tab === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setTab(t.key)}
                  className="flex-1 flex-row items-center justify-center rounded-[18px] py-2.5 active:opacity-90"
                  style={{ backgroundColor: active ? '#fff' : 'transparent' }}
                >
                  <Ionicons
                    name={t.icon as keyof typeof Ionicons.glyphMap}
                    size={15}
                    color={active ? BRAND_BLUE : '#94A3B8'}
                    style={{ marginRight: 5 }}
                  />
                  <AppText
                    className="text-[13px]"
                    style={{
                      color: active ? BRAND_BLUE : '#64748B',
                      fontFamily: active ? 'Inter-SemiBold' : 'Inter-Medium',
                    }}
                    numberOfLines={1}
                  >
                    {t.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={BRAND_BLUE} />
          </View>
        ) : hasSaved ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 24 }}>
            {saved!.map((l) => (
              <Pressable
                key={l._id}
                onPress={() => router.push({ pathname: '/listing/[id]', params: { id: l._id } })}
                className="mb-3 flex-row items-center overflow-hidden rounded-[26px] border border-white/70 p-3 active:opacity-90"
                style={styles.itemCard}
              >
                <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
                <View className="mr-3 items-center justify-center overflow-hidden rounded-[20px] bg-white/70" style={{ width: 96, height: 86 }}>
                  {l.photoUrls?.[0] ? (
                    <Image source={{ uri: l.photoUrls[0] }} contentFit="cover" style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <Image
                      source={CATEGORY_IMAGES[l.category] ?? CATEGORY_IMAGES.cattle}
                      contentFit="contain"
                      style={{ width: '84%', height: '84%' }}
                    />
                  )}
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <AppText className="flex-1 font-semibold text-base text-foreground" numberOfLines={1}>
                      {l.title}
                    </AppText>
                    <View className="ml-2 h-7 w-7 items-center justify-center rounded-full bg-white/70">
                      <Ionicons name="heart" size={15} color={BRAND_BLUE} />
                    </View>
                  </View>
                  <AppText className="mt-1 font-display text-2xl text-[#0F172A]" numberOfLines={1}>
                    {l.price}
                  </AppText>
                  <View className="mt-1 flex-row items-center">
                    <Ionicons name="location-outline" size={15} color={BRAND_BLUE} />
                    <AppText className="ml-1 text-sm font-medium text-[#64748B]" numberOfLines={1}>
                      {l.city}
                    </AppText>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </Pressable>
            ))}
          </ScrollView>
        ) : hasVideos ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 24 }}>
            <View className="flex-row flex-wrap justify-between">
              {likedReels!.map((r) => (
                <Pressable
                  key={r._id}
                  onPress={() => router.push({ pathname: '/reels', params: { start: r._id } } as never)}
                  style={[styles.videoCard, { width: '48.5%' }]}
                  className="mb-4 overflow-hidden rounded-[24px] border border-white/70 active:opacity-90"
                >
                  <View style={{ aspectRatio: 0.75 }}>
                    {r.thumbUrl ? (
                      <Image
                        source={{ uri: r.thumbUrl }}
                        contentFit="cover"
                        style={{ position: 'absolute', width: '100%', height: '100%' }}
                      />
                    ) : (
                      <View className="h-full w-full items-center justify-center bg-neutral-900">
                        <Ionicons name="videocam" size={30} color="#fff" />
                      </View>
                    )}
                    <View className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-black/45">
                      <Ionicons name="play" size={18} color="#fff" style={{ marginLeft: 2 }} />
                    </View>
                    <LinearGradient
                      pointerEvents="none"
                      colors={['transparent', 'rgba(0,0,0,0.72)']}
                      style={StyleSheet.absoluteFill}
                    />
                    <View className="absolute bottom-0 left-0 right-0 p-3">
                      <AppText className="font-bold text-sm text-white" numberOfLines={1}>
                        {r.price ?? r.title}
                      </AppText>
                      <AppText className="mt-0.5 text-xs text-white/75" numberOfLines={1}>
                        {r.sellerName ?? r.city ?? 'Video bozor'}
                      </AppText>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        ) : (
          <View className="flex-1 items-center px-8 pt-12">
            <GlassPanel className="w-full items-center px-5 py-7">
              <Image
                source={require('../../assets/illustrations/saved-empty.png')}
                contentFit="contain"
                style={{ width: 240, height: 150, marginBottom: 18 }}
              />
              <AppText className="mb-3 text-center font-bold text-2xl text-foreground">
                {tab === 'listings'
                  ? 'Qiziqarli hayvonlarni saqlang'
                  : tab === 'videos'
                    ? 'Yoqgan videolaringiz shu yerda'
                    : 'Qidiruvlarni saqlang'}
              </AppText>
              <AppText className="mb-8 text-center text-base leading-6 text-muted">
                {tab === 'listings'
                  ? "E'longa yurakcha bosing va saqlang"
                  : tab === 'videos'
                    ? "Video bozorda yurakcha bosganlaringizni qayta ko'rasiz"
                    : 'Qidiruv natijalarini saqlab, tez toping'}
              </AppText>
              <Pressable
                onPress={() => router.push((tab === 'videos' ? '/reels' : '/home') as never)}
                className="h-14 w-full items-center justify-center rounded-2xl active:opacity-90"
                style={{ backgroundColor: BRAND_BLUE }}
              >
                <AppText className="font-semibold text-base text-white">
                  {tab === 'videos' ? "Video bozorga o'tish" : 'Asosiy sahifaga qaytish'}
                </AppText>
              </Pressable>
            </GlassPanel>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

function Stat({ label, value, active = false }: { label: string; value: number; active?: boolean }) {
  return (
    <View className="items-center rounded-2xl bg-white/55 px-3 py-2">
      <AppText className="font-display text-2xl" style={{ color: active ? BRAND_BLUE : '#0F172A' }}>
        {value}
      </AppText>
      <AppText className="text-[11px] font-semibold text-[#64748B]">{label}</AppText>
    </View>
  );
}

function GlassPanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <View className={`overflow-hidden rounded-[28px] border border-white/70 ${className}`} style={styles.glassPanel}>
      <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,255,255,0.92)', 'rgba(255,255,255,0.22)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

function ScreenGlow() {
  return (
    <>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(10,108,255,0.22)', 'rgba(255,255,255,0)', 'rgba(15,23,42,0.08)']}
        locations={[0, 0.48, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View className="absolute -right-24 -top-20 h-72 w-72 rounded-full bg-white/70" />
      <View className="absolute -left-20 top-40 h-52 w-52 rounded-full" style={{ backgroundColor: BRAND_BLUE + '18' }} />
    </>
  );
}

const styles = StyleSheet.create({
  glassPanel: {
    backgroundColor: 'rgba(255,255,255,0.62)',
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  itemCard: {
    backgroundColor: 'rgba(255,255,255,0.68)',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  videoCard: {
    backgroundColor: '#0F172A',
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },
});
