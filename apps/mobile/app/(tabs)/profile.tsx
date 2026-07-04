import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/app-text';
import { Logo } from '../../components/logo';
import { CATEGORY_IMAGES } from '../../constants/category-images';
import { BRAND_BLUE } from '../../constants/theme';

export default function Profile() {
  const router = useRouter();

  return (
    <View className="flex-1" style={{ backgroundColor: '#F4F5F7' }}>
      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 pb-2 pt-2">
            <AppText className="font-bold text-2xl text-foreground">+998 77 033 84 30</AppText>
            <Pressable onPress={() => router.push('/settings')} hitSlop={8} className="flex-row items-center active:opacity-70">
              <Ionicons name="settings-outline" size={20} color={BRAND_BLUE} />
              <AppText className="ml-1.5 font-medium text-base" style={{ color: BRAND_BLUE }}>Sozlamalar</AppText>
            </Pressable>
          </View>

          {/* Balance card */}
          <View className="mx-4 mt-3 rounded-2xl bg-surface p-4">
            <View className="flex-row items-center justify-between">
              <View>
                <AppText className="font-semibold text-lg text-foreground">Halolmi hisobi</AppText>
                <AppText className="mt-1 text-base text-muted">💰 0 soʻm</AppText>
              </View>
              <Pressable className="items-center justify-center rounded-xl px-5 py-3 active:opacity-80" style={{ backgroundColor: BRAND_BLUE + '1A' }}>
                <AppText className="font-semibold text-base" style={{ color: BRAND_BLUE }}>Toʻldirish</AppText>
              </Pressable>
            </View>
            <View className="my-3 h-px bg-border" />
            <Pressable className="flex-row items-center active:opacity-70">
              <View className="mr-3 h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: BRAND_BLUE }}>
                <AppText className="text-white" style={{ fontFamily: 'Fredoka-SemiBold', fontSize: 16 }}>H</AppText>
              </View>
              <AppText className="flex-1 font-medium text-base text-foreground">Halolmi | Admin</AppText>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </Pressable>
          </View>

          {/* My listings */}
          <AppText className="mb-2 mt-5 px-4 font-bold text-lg text-foreground">
            Mening eʼlonlarim
          </AppText>
          <View className="mx-4 rounded-2xl bg-surface p-4">
            <AppText className="font-semibold text-base text-foreground">
              Golshteyn naslli sigir, 2023
            </AppText>
            <AppText className="mb-3 mt-0.5 font-bold text-xl text-foreground">18 500 000 soʻm</AppText>

            <View className="flex-row">
              <View className="mr-4 items-center justify-center overflow-hidden rounded-xl bg-surface-secondary" style={{ width: 130, height: 100 }}>
                <Image source={CATEGORY_IMAGES.cattle} contentFit="contain" style={{ width: '86%', height: '86%' }} />
              </View>
              <View className="flex-1 justify-center">
                <View className="self-start rounded-md px-2.5 py-1" style={{ backgroundColor: '#FCD34D' }}>
                  <AppText className="text-sm font-medium text-foreground">Tekshiruvda</AppText>
                </View>
                <AppText className="mt-2 text-sm leading-5 text-muted">
                  Admin eʼlonni 10 daqiqa ichida tekshirib joylashtiradi.
                </AppText>
              </View>
            </View>

            <Pressable className="mt-3 h-12 flex-row items-center justify-center rounded-xl active:opacity-90" style={{ backgroundColor: BRAND_BLUE }}>
              <AppText className="text-base">🔥</AppText>
              <AppText className="ml-2 font-semibold text-base text-white">Reklama qilish</AppText>
            </Pressable>
          </View>

          {/* Version */}
          <View className="mt-8 items-center">
            <Logo className="text-[#0F172A]" size={18} />
            <AppText className="mt-1 text-sm text-muted">1.0.0 versiyasi</AppText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
