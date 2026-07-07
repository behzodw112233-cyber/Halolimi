import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Channel, MessageComposer, MessageList } from 'stream-chat-expo';
import type { Channel as StreamChannel } from 'stream-chat';
import { AppText } from '../../components/app-text';
import { BRAND_BLUE } from '../../constants/theme';
import { useStream } from '../../lib/stream';

export default function Conversation() {
  const router = useRouter();
  const { id, name = 'Sotuvchi' } = useLocalSearchParams<{ id: string; name?: string }>();
  const { chatClient } = useStream();
  const { top } = useSafeAreaInsets();
  const headerHeight = (Platform.OS === 'ios' ? 44 : 56) + top;

  const channel = useMemo<StreamChannel | undefined>(() => {
    if (!chatClient) return undefined;
    const [type, cid] = id.includes(':') ? id.split(':') : ['messaging', id];
    return chatClient.channel(type, cid);
  }, [chatClient, id]);

  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!channel) return;
    channel.watch().then(() => setReady(true)).catch(() => setReady(true));
  }, [channel]);

  const startCall = () => {
    if (!channel?.id) return;
    // Cast: typed-routes cache regenerates the /call route on next dev-server start.
    router.push({ pathname: '/call/[id]', params: { id: channel.id, name: String(name) } } as unknown as Href);
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: top }}>
      {/* Header */}
      <View className="flex-row items-center border-b border-border px-2 py-2">
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/chat'))}
          hitSlop={10}
          className="h-9 w-9 items-center justify-center"
        >
          <Ionicons name="arrow-back" size={24} color={BRAND_BLUE} />
        </Pressable>
        <View className="mr-2 h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: BRAND_BLUE }}>
          <AppText className="font-semibold text-base text-white">
            {String(name).charAt(0).toUpperCase()}
          </AppText>
        </View>
        <AppText className="flex-1 font-semibold text-base text-foreground" numberOfLines={1}>
          {name}
        </AppText>
        <Pressable onPress={startCall} hitSlop={10} className="h-9 w-9 items-center justify-center">
          <Ionicons name="videocam" size={24} color={BRAND_BLUE} />
        </Pressable>
      </View>

      {!channel || !ready ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={BRAND_BLUE} />
        </View>
      ) : (
        <Channel channel={channel} keyboardVerticalOffset={headerHeight}>
          <View style={{ flex: 1 }}>
            <MessageList />
            <MessageComposer />
          </View>
        </Channel>
      )}
    </View>
  );
}
