import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Button, Typography } from 'heroui-native';
import { Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo } from '../components/logo';

const BRAND_BLUE = '#0A6CFF';

const LANGUAGES = [
  { code: 'uz', label: "O'zbek tili" },
  { code: 'ru', label: 'Русский' },
] as const;

export default function Language() {
  const router = useRouter();

  const select = (code: string) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }
    // TODO: persist locale (AsyncStorage / i18n) — code = selected language
    router.replace('/intent');
  };

  return (
    <View className="flex-1" style={{ backgroundColor: BRAND_BLUE }}>
      <StatusBar style="light" />
      <SafeAreaView className="flex-1 px-8" edges={['top', 'bottom']}>
        {/* Logo */}
        <Logo className="mt-2 pl-3" />

        <View className="flex-1" />

        {/* Greeting */}
        <Typography
          type="h2"
          weight="bold"
          className="mb-2 pl-3 text-4xl text-white"
        >
          Assalomu alaykum!
        </Typography>
        <Typography weight="medium" className="mb-6 pl-3 text-lg text-white/90">
          Tilni tanlang / Выберите язык
        </Typography>

        {/* Language options */}
        <View className="gap-4 px-3 pb-4">
          {LANGUAGES.map((lang) => (
            <Button
              key={lang.code}
              variant="secondary"
              size="lg"
              onPress={() => select(lang.code)}
              className="h-16 w-full justify-start rounded-2xl border-0 bg-white pl-9 pr-5"
            >
              <Button.Label className="text-lg font-medium text-[#0A0A0A]">
                {lang.label}
              </Button.Label>
            </Button>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
}
