import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/app-text';
import { BRAND_BLUE } from '../constants/theme';

export default function Review() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView className="flex-1 px-6" edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center">
          <View className="flex-row flex-wrap items-center justify-center">
            <AppText className="text-2xl font-bold text-foreground">Eʼlon admin </AppText>
            <AppText
              className="text-2xl font-bold text-foreground"
              style={{ backgroundColor: '#FCD34D', paddingHorizontal: 6, borderRadius: 4 }}
            >
              tekshiruvida
            </AppText>
          </View>
          <AppText className="mt-2 text-2xl font-bold text-foreground">10 daqiqa gacha</AppText>
        </View>

        <View className="px-2 pb-6">
          <Pressable
            onPress={() => router.replace('/home')}
            className="mb-3 h-14 items-center justify-center rounded-2xl active:opacity-80"
            style={{ backgroundColor: BRAND_BLUE + '1A' }}
          >
            <AppText className="font-semibold text-base" style={{ color: BRAND_BLUE }}>
              Eʼlonni koʻrish
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => router.replace('/home')}
            className="h-14 items-center justify-center rounded-2xl active:opacity-90"
            style={{ backgroundColor: BRAND_BLUE }}
          >
            <AppText className="font-semibold text-base text-white">
              Qoʻshimcha maʼlumot toʻldirish
            </AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
