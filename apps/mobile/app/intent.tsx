import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Button, Typography } from 'heroui-native';
import { Platform, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo } from '../components/logo';
import { useAuth } from '../lib/auth';

const BRAND_BLUE = '#0A6CFF';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const OPTIONS: { code: string; label: string; icon: IoniconName }[] = [
  { code: 'sell', label: 'Hayvon sotish', icon: 'pricetag' },
  { code: 'buy', label: 'Hayvon qidirish', icon: 'search' },
  { code: 'browse', label: "Shunchaki ko'rmoqchiman", icon: 'eye' },
];

export default function Intent() {
  const router = useRouter();
  const { finishOnboarding } = useAuth();

  const haptic = () => {
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
  };

  const choose = (code: string) => {
    haptic();
    if (code === 'sell') {
      router.push('/sell');
      return;
    }
    // 'buy' → search, 'browse' → feed. Both land on the home tabs for now.
    finishOnboarding();
    router.replace('/home');
  };

  const close = () => {
    haptic();
    finishOnboarding();
    router.replace('/home');
  };

  return (
    <View className="flex-1" style={{ backgroundColor: BRAND_BLUE }}>
      <StatusBar style="light" />
      <SafeAreaView className="flex-1 px-8" edges={['top', 'bottom']}>
        {/* Top bar */}
        <View className="h-12 flex-row items-center justify-between">
          <Logo className="mt-1 pl-3" />
          <Pressable
            onPress={close}
            hitSlop={12}
            className="h-9 w-9 items-center justify-center rounded-full"
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <Ionicons name="close" size={26} color="white" />
          </Pressable>
        </View>

        <View className="flex-1" />

        {/* Heading */}
        <Typography
          type="h2"
          weight="bold"
          className="mb-6 pl-3 text-4xl text-white"
        >
          Qanday yordam kerak?
        </Typography>

        {/* Options */}
        <View className="gap-4 px-3 pb-4">
          {OPTIONS.map((opt) => (
            <Button
              key={opt.code}
              variant="secondary"
              size="lg"
              onPress={() => choose(opt.code)}
              className="h-16 w-full justify-start rounded-2xl border-0 bg-white pl-4 pr-5"
            >
              <View className="flex-row items-center">
                <View
                  className="mr-4 h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: BRAND_BLUE + '1A' }}
                >
                  <Ionicons name={opt.icon} size={20} color={BRAND_BLUE} />
                </View>
                <Button.Label className="text-base font-medium text-[#0A0A0A]">
                  {opt.label}
                </Button.Label>
              </View>
            </Button>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
}
