import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from './app-text';
import { BRAND_BLUE } from '../constants/theme';

export function NativeFeatureUnavailable({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  const router = useRouter();
  return (
    <View className="flex-1 bg-background">
      <SafeAreaView className="flex-1 items-center justify-center px-6">
        <View className="mb-5 h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: BRAND_BLUE + '18' }}>
          <Ionicons name="phone-portrait-outline" size={34} color={BRAND_BLUE} />
        </View>
        <AppText className="text-center font-bold text-2xl text-foreground">{title}</AppText>
        <AppText className="mt-3 text-center text-base leading-6 text-muted">{body}</AppText>
        <Pressable
          onPress={() => router.replace('/home')}
          className="mt-8 h-13 items-center justify-center rounded-2xl px-8 py-4 active:opacity-90"
          style={{ backgroundColor: BRAND_BLUE }}
        >
          <AppText className="font-semibold text-base text-white">Bozorga qaytish</AppText>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}
