import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/app-text';
import { BRAND_BLUE } from '../../constants/theme';

const TABS = [
  { key: 'listings', label: 'Eʼlonlar' },
  { key: 'searches', label: 'Qidiruvlar' },
] as const;

export default function Saved() {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('listings');

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

        {/* Empty state */}
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
      </SafeAreaView>
    </View>
  );
}
