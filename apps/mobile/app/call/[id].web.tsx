import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/app-text';
import { BRAND_BLUE } from '../../constants/theme';

export default function CallWebFallback() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-6">
        <View className="h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: BRAND_BLUE }}>
          <Ionicons name="videocam" size={34} color="#fff" />
        </View>
        <AppText className="mt-5 text-center text-2xl font-bold text-foreground">Video qo'ng'iroq mobil ilovada</AppText>
        <AppText className="mt-2 max-w-sm text-center text-base leading-6 text-muted-foreground">
          Brauzer rejimi e'lon, profil va to'lovlarni tekshirish uchun ishlaydi. Video qo'ng'iroq uchun Android yoki iOS
          ilovani oching.
        </AppText>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/chat'))}
          className="mt-7 h-14 items-center justify-center rounded-2xl px-8 active:opacity-80"
          style={{ backgroundColor: BRAND_BLUE }}
        >
          <AppText className="text-base font-bold text-white">Chatga qaytish</AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
