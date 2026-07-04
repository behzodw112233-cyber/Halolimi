import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/app-text';
import { NOTIFICATIONS } from '../constants/notifications';
import { BRAND_BLUE } from '../constants/theme';

export default function Notifications() {
  const router = useRouter();

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

        {NOTIFICATIONS.length === 0 ? (
          <View className="flex-1 items-center justify-center px-10">
            <Ionicons name="notifications-off-outline" size={48} color="#9ca3af" />
            <AppText className="mt-3 text-center text-base text-muted">
              Hozircha bildirishnomalar yoʻq
            </AppText>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {NOTIFICATIONS.map((n) => (
              <View
                key={n.id}
                className="flex-row border-b border-border px-4 py-4"
                style={{ backgroundColor: n.unread ? BRAND_BLUE + '0A' : 'transparent' }}
              >
                <View
                  className="mr-3 h-11 w-11 items-center justify-center rounded-full"
                  style={{ backgroundColor: BRAND_BLUE + '14' }}
                >
                  <Ionicons name={n.icon} size={22} color={BRAND_BLUE} />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <AppText className="flex-1 font-semibold text-[15px] text-foreground">
                      {n.title}
                    </AppText>
                    {n.unread && (
                      <View
                        style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' }}
                      />
                    )}
                  </View>
                  <AppText className="mt-0.5 text-sm leading-5 text-muted">
                    {n.body}
                  </AppText>
                  <AppText className="mt-1 text-xs text-muted">{n.time}</AppText>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}
