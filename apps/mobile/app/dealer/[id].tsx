import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/app-text';

/** Full-screen player for an official-dealer showcase video. */
export default function DealerVideo() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { video, title, dealer } = useLocalSearchParams<{
    video?: string;
    title?: string;
    dealer?: string;
  }>();

  const player = useVideoPlayer(video ? String(video) : '', (p) => {
    p.loop = false;
    p.play();
  });

  return (
    <View className="flex-1 bg-black">
      <VideoView player={player} style={{ flex: 1 }} contentFit="contain" nativeControls />

      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}
        hitSlop={12}
        className="absolute h-10 w-10 items-center justify-center rounded-full bg-black/50"
        style={{ top: top + 8, left: 12 }}
      >
        <Ionicons name="close" size={26} color="#fff" />
      </Pressable>

      {title ? (
        <View className="absolute left-4 right-4" style={{ bottom: 44 }} pointerEvents="none">
          <AppText className="font-bold text-lg text-white">{String(title)}</AppText>
          {dealer ? <AppText className="mt-0.5 text-sm text-white/80">{String(dealer)}</AppText> : null}
        </View>
      ) : null}
    </View>
  );
}
