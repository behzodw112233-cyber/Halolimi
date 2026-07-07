import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChannelList } from 'stream-chat-expo';
import type { Channel as StreamChannel } from 'stream-chat';
import { AppText } from '../../components/app-text';
import { BRAND_BLUE } from '../../constants/theme';
import { useAuth } from '../../lib/auth';
import { useStream } from '../../lib/stream';

export default function Chat() {
  const router = useRouter();
  const { userId } = useAuth();
  const { chatClient } = useStream();

  const filters = useMemo(
    () => ({ members: { $in: [userId ?? ''] }, type: 'messaging' }),
    [userId]
  );
  const sort = useMemo(() => [{ last_message_at: -1 as const }], []);
  const options = useMemo(() => ({ limit: 20, messages_limit: 30 }), []);

  const openChannel = (channel: StreamChannel) => {
    // Show the counterpart's name (the other member of this 1:1 channel).
    const other = Object.values(channel.state.members).find((m) => m.user?.id !== userId);
    router.push({
      pathname: '/chat/[id]',
      params: { id: channel.cid, name: other?.user?.name ?? 'Sotuvchi' },
    });
  };

  // Not logged in → prompt.
  if (!userId) {
    return (
      <View className="flex-1 bg-background">
        <SafeAreaView className="flex-1" edges={['top']}>
          <View className="px-4 pb-2 pt-2">
            <AppText className="font-bold text-2xl text-foreground">Suhbatlar</AppText>
          </View>
          <View className="flex-1 items-center justify-center px-10">
            <Ionicons name="chatbubbles-outline" size={48} color="#9ca3af" />
            <AppText className="mb-6 mt-3 text-center text-base text-muted">
              Suhbatlashish uchun hisobingizga kiring.
            </AppText>
            <Pressable
              onPress={() => router.push('/login')}
              className="h-12 items-center justify-center rounded-2xl px-8 active:opacity-90"
              style={{ backgroundColor: BRAND_BLUE }}
            >
              <AppText className="font-semibold text-base text-white">Kirish</AppText>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="px-4 pb-2 pt-2">
          <AppText className="font-bold text-2xl text-foreground">Suhbatlar</AppText>
        </View>
        {!chatClient ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={BRAND_BLUE} />
          </View>
        ) : (
          <ChannelList filters={filters} sort={sort} options={options} onSelect={openChannel} />
        )}
      </SafeAreaView>
    </View>
  );
}
