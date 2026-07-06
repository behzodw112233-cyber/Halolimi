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
  { key: 'listings', label: 'Eʼlonlar' },
  { key: 'searches', label: 'Qidiruvlar' },
] as const;

export default function Saved() {
  const router = useRouter();
  const { userId } = useAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('listings');

  const saved = useQuery(api.saved.list, userId ? { userId } : 'skip');
  const hasSaved = tab === 'listings' && !!saved && saved.length > 0;

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="px-4 pb-3 pt-2">
          <AppText className="mb-4 font-bold text-2xl text-foreground">
            Saqlangan
          </AppText>

          {/* Segmented control */}
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
        ) : (
          /* Empty state */
          <View className="flex-1 items-center justify-center px-10">
            <Image
              source={require('../../assets/illustrations/saved-empty.png')}
              contentFit="contain"
              style={{ width: 300, height: 210, marginBottom: 20 }}
            />
            <AppText className="mb-2 text-center font-bold text-lg text-foreground">
              {tab === 'listings'
                ? 'Qiziqarli hayvonlarni saqlang'
                : 'Qidiruvlarni saqlang'}
            </AppText>
            <AppText className="mb-8 text-center text-base leading-6 text-muted">
              {tab === 'listings'
                ? 'Eʼlonga ♡ bosing va oʻzingizga saqlang'
                : 'Qidiruv natijalarini saqlab, tez toping'}
            </AppText>
            <Pressable
              onPress={() => router.push('/home')}
              className="h-14 w-full items-center justify-center rounded-2xl active:opacity-90"
              style={{ backgroundColor: BRAND_BLUE }}
            >
              <AppText className="font-semibold text-base text-white">
                Asosiy sahifaga qaytish
              </AppText>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}
