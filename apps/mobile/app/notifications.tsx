import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/app-text';
import { BRAND_BLUE } from '../constants/theme';
import { useNotifications } from '../lib/notifications';

const relTime = (ts: number) => {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'Hozir';
  if (mins < 60) return `${mins} daqiqa oldin`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} soat oldin`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? 'Kecha' : `${days} kun oldin`;
};

export default function Notifications() {
  const router = useRouter();
  const { items, markSeen } = useNotifications();
  const notifications = items ?? [];
  const latestNotificationKey = notifications[0]
    ? `${notifications[0]._id}:${notifications[0].createdAt}`
    : '';

  const openNotification = (n: (typeof notifications)[number]) => {
    if (n.targetType === 'chat' && n.targetId) {
      router.push({ pathname: '/chat/[id]', params: { id: n.targetId } });
    } else if (n.targetType === 'listing' && n.targetId) {
      router.push({ pathname: '/listing/[id]', params: { id: n.targetId } });
    } else if (n.targetType === 'seller' || n.targetType === 'review') {
      if (n.targetId) router.push({ pathname: '/seller/[id]', params: { id: n.targetId } });
    } else if (n.targetType === 'call' && n.targetId) {
      router.push({ pathname: '/call/[id]', params: { id: n.targetId, role: 'callee' } } as never);
    }
  };

  // Opening the screen clears the unread badge.
  useEffect(() => {
    if (latestNotificationKey) markSeen();
  }, [latestNotificationKey]);

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        {/* Header */}
        <View className="h-14 flex-row items-center border-b border-border px-3">
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            className="h-9 w-9 items-center justify-center rounded-full"
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <Ionicons name="arrow-back" size={24} color={BRAND_BLUE} />
          </Pressable>
          <AppText className="ml-1 font-bold text-xl text-foreground">
            Bildirishnomalar
          </AppText>
        </View>

        {notifications.length === 0 ? (
          <View className="flex-1 items-center justify-center px-10">
            <Ionicons name="notifications-off-outline" size={48} color="#9ca3af" />
            <AppText className="mt-3 text-center text-base text-muted">
              Hozircha bildirishnomalar yoʻq
            </AppText>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {notifications.map((n) => (
              <Pressable
                key={n._id}
                className="flex-row border-b border-border px-4 py-4"
                onPress={() => openNotification(n)}
                disabled={!n.targetType}
                style={({ pressed }) => ({
                  backgroundColor: !n.readAt && n.targetType ? BRAND_BLUE + '08' : 'transparent',
                  opacity: pressed ? 0.72 : 1,
                })}
              >
                <View
                  className="mr-3 h-11 w-11 items-center justify-center rounded-full"
                  style={{ backgroundColor: !n.readAt && n.targetType ? BRAND_BLUE : BRAND_BLUE + '14' }}
                >
                  <Ionicons
                    name={n.icon as keyof typeof Ionicons.glyphMap}
                    size={22}
                    color={!n.readAt && n.targetType ? '#fff' : BRAND_BLUE}
                  />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-start">
                    <AppText className="flex-1 font-semibold text-[15px] text-foreground">
                      {n.title}
                    </AppText>
                    {!n.readAt && n.targetType ? (
                      <View className="ml-2 mt-1.5 h-2 w-2 rounded-full" style={{ backgroundColor: BRAND_BLUE }} />
                    ) : null}
                  </View>
                  <AppText className="mt-0.5 text-sm leading-5 text-muted">
                    {n.body}
                  </AppText>
                  <AppText className="mt-1 text-xs text-muted">{relTime(n.createdAt)}</AppText>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}
