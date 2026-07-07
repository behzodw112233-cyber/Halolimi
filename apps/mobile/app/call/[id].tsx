import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import {
  Call,
  CallContent,
  CallingState,
  StreamCall,
  useStreamVideoClient,
} from '@stream-io/video-react-native-sdk';
import { AppText } from '../../components/app-text';

export default function CallScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = useStreamVideoClient();
  const [call, setCall] = useState<Call>();

  useEffect(() => {
    if (!client || !id) return;
    // reuseInstance: the same (type, id) may already exist from a ring/deep-link.
    const c = client.call('default', id, { reuseInstance: true });
    setCall(c);
    c.setDisconnectionTimeout(120);
    (async () => {
      try {
        await c.join({ create: true });
      } catch {
        /* join failed — leave screen */
      }
    })();
    return () => {
      if (c.state.callingState !== CallingState.LEFT) c.leave().catch(() => {});
      setCall(undefined);
    };
  }, [client, id]);

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/chat'));

  if (!client) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <AppText className="text-white">Videoqoʻngʻiroq mavjud emas</AppText>
      </View>
    );
  }
  if (!call) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <AppText className="text-white">Qoʻngʻiroqqa ulanmoqda...</AppText>
      </View>
    );
  }

  return (
    <StreamCall call={call}>
      <CallContent onHangupCallHandler={leave} />
    </StreamCall>
  );
}
