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

  // Opening the screen clears the unread badge.
  useEffect(() => {
    if (items) markSeen();
  }, [items, markSeen]);

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
              <View
                key={n._id}
                className="flex-row border-b border-border px-4 py-4"
              >
                <View
                  className="mr-3 h-11 w-11 items-center justify-center rounded-full"
                  style={{ backgroundColor: BRAND_BLUE + '14' }}
                >
                  <Ionicons name={n.icon as keyof typeof Ionicons.glyphMap} size={22} color={BRAND_BLUE} />
                </View>
                <View className="flex-1">
                  <AppText className="font-semibold text-[15px] text-foreground">
                    {n.title}
                  </AppText>
                  <AppText className="mt-0.5 text-sm leading-5 text-muted">
                    {n.body}
                  </AppText>
                  <AppText className="mt-1 text-xs text-muted">{relTime(n.createdAt)}</AppText>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}
