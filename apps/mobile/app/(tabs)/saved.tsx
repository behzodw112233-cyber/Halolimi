import { Ionicons } from '@expo/vector-icons';
import { api } from '@halolmia/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/app-text';
import { CATEGORY_IMAGES } from '../../constants/category-images';
import { BRAND_BLUE } from '../../constants/theme';
import { useAuth } from '../../lib/auth';

const TABS = [
  { key: 'listings', label: "E'lonlar" },
  { key: 'videos', label: 'Videolar' },
  { key: 'searches', label: 'Qidiruvlar' },
] as const;

export default function Saved() {
  const router = useRouter();
  const { userId } = useAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('listings');

  const saved = useQuery(api.saved.list, userId ? { userId } : 'skip');
  const likedReels = useQuery(api.reels.likedByUser, userId ? { userId } : 'skip');
  const hasSaved = tab === 'listings' && !!saved && saved.length > 0;
  const hasVideos = tab === 'videos' && !!likedReels && likedReels.length > 0;

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="px-4 pb-3 pt-2">
          <AppText className="mb-4 font-bold text-2xl text-foreground">
            Saqlangan
          </AppText>

          <View className="flex-row rounded-xl bg-surface-secondary p-1">
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setTab(t.key)}
                  className="flex-1 items-center rounded-lg py-2.5"
                  style={{ backgroundColor: active ? '#fff' : 'transparent' }}
                >
                  <AppText
                    className="text-[15px]"
                    style={{
                      color: active ? BRAND_BLUE : '#6b7280',
                      fontFamily: active ? 'Inter-SemiBold' : 'Inter-Medium',
                    }}
                  >
                    {t.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {hasSaved ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingTop: 4 }}>
            {saved!.map((l) => (
              <Pressable
                key={l._id}
                onPress={() => router.push({ pathname: '/listing/[id]', params: { id: l._id } })}
                className="mb-3 flex-row items-center rounded-2xl bg-surface p-3 active:opacity-90"
              >
                <View className="mr-3 items-center justify-center overflow-hidden rounded-xl bg-surface-secondary" style={{ width: 92, height: 82 }}>
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
                  <AppText className="font-semibold text-base text-foreground" numberOfLines={1}>
                    {l.title}
                  </AppText>
                  <AppText className="mt-0.5 font-bold text-lg text-foreground">{l.price}</AppText>
                  <AppText className="mt-0.5 text-sm text-muted">{l.city}</AppText>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        ) : hasVideos ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingTop: 4 }}>
            <View className="flex-row flex-wrap justify-between">
              {likedReels!.map((r) => (
                <Pressable
                  key={r._id}
                  onPress={() => router.push({ pathname: '/reels', params: { start: r._id } } as never)}
                  style={{ width: '48.5%' }}
                  className="mb-4 overflow-hidden rounded-2xl bg-black active:opacity-90"
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
                    <View className="absolute bottom-0 left-0 right-0 p-2" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
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
          <View className="flex-1 items-center px-8 pt-16">
            <Image
              source={require('../../assets/illustrations/saved-empty.png')}
              contentFit="contain"
              style={{ width: 260, height: 170, marginBottom: 24 }}
            />
            <AppText className="mb-3 text-center font-bold text-2xl text-foreground">
              {tab === 'listings'
                ? 'Qiziqarli hayvonlarni saqlang'
                : tab === 'videos'
                  ? 'Yoqgan videolaringiz shu yerda'
                  : 'Qidiruvlarni saqlang'}
            </AppText>
            <AppText className="mb-10 text-center text-lg leading-7 text-muted">
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
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}
