import { Ionicons } from '@expo/vector-icons';
import { api } from '@halolmia/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { AppText } from './app-text';
import { BRAND_BLUE } from '../constants/theme';
import { useAuth } from '../lib/auth';

/**
 * Full-screen "incoming video call" overlay. Mounted once near the app root so
 * a call can ring from anywhere while the app is in the foreground.
 */
export function IncomingCallOverlay() {
  const { userId } = useAuth();
  const router = useRouter();
  const call = useQuery(api.calls.incoming, userId ? { userId } : 'skip');
  const decline = useMutation(api.calls.decline);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  if (!call || call._id === dismissedId) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: '#0B0B0FE6' }}>
        <View className="h-24 w-24 items-center justify-center rounded-full" style={{ backgroundColor: BRAND_BLUE }}>
          <AppText className="text-3xl font-bold text-white">{call.callerName.charAt(0).toUpperCase()}</AppText>
        </View>
        <AppText className="mt-4 text-xl font-semibold text-white">{call.callerName}</AppText>
        <AppText className="mt-1 text-base text-white/70">Video qoʻngʻiroq qilyapti…</AppText>
        <View className="mt-12 flex-row gap-12">
          <View className="items-center">
            <Pressable
              onPress={() => {
                setDismissedId(call._id);
                decline({ callId: call._id }).catch(() => {});
              }}
              className="h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: '#DC2626' }}
            >
              <Ionicons name="call" size={26} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
            </Pressable>
            <AppText className="mt-2 text-sm text-white/80">Rad etish</AppText>
          </View>
          <View className="items-center">
            <Pressable
              onPress={() => {
                setDismissedId(call._id);
                router.push({ pathname: '/call/[id]', params: { id: call._id, role: 'callee' } } as unknown as Href);
              }}
              className="h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: '#16A34A' }}
            >
              <Ionicons name="call" size={26} color="#fff" />
            </Pressable>
            <AppText className="mt-2 text-sm text-white/80">Qabul qilish</AppText>
          </View>
        </View>
      </View>
    </Modal>
  );
}
