import { Ionicons } from '@expo/vector-icons';
import { api } from '@halolmia/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { ScrollView, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/app-text';
import { BRAND_BLUE } from '../../constants/theme';
import { useAuth } from '../../lib/auth';

const fmtTime = (ts: number) =>
  ts ? new Date(ts).toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' }) : '';

export default function Chat() {
  const router = useRouter();
  const { userId } = useAuth();
  const threads = useQuery(api.messages.threads, userId ? { userId } : 'skip');

  const empty = !userId || (threads && threads.length === 0);

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="px-4 pb-2 pt-2">
          <AppText className="font-bold text-2xl text-foreground">Suhbatlar</AppText>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Official Halolmi welcome */}
          <Pressable
            onPress={() => router.push({ pathname: '/chat/[id]', params: { id: 'halolmi-official', name: 'Halolmi' } })}
            className="flex-row items-center border-b border-border px-4 py-3 active:bg-surface-secondary"
          >
            <View className="mr-3 h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: BRAND_BLUE }}>
              <AppText className="text-center text-white" style={{ fontFamily: 'Fredoka-SemiBold', fontSize: 14, lineHeight: 16 }}>
                Halol{'\n'}mi
              </AppText>
            </View>
            <View className="flex-1">
              <View className="flex-row items-center">
                <AppText className="font-semibold text-base text-foreground">Halolmi</AppText>
                <Ionicons name="checkmark-circle" size={16} color={BRAND_BLUE} style={{ marginLeft: 4 }} />
              </View>
              <AppText className="mt-1 text-sm text-muted" numberOfLines={1}>
                ✅ Hayvonlarni oson qidirib toping
              </AppText>
            </View>
          </Pressable>

          {/* Real conversations */}
          {threads?.map((t) => (
            <Pressable
              key={t.threadId}
              onPress={() => router.push({ pathname: '/chat/[id]', params: { id: t.threadId, name: 'Sotuvchi' } })}
              className="flex-row items-center border-b border-border px-4 py-3 active:bg-surface-secondary"
            >
              <View className="mr-3 h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: '#E5E7EB' }}>
                <Ionicons name="person" size={26} color="#9ca3af" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <AppText className="font-semibold text-base text-foreground">Sotuvchi</AppText>
                  <View className="flex-1" />
                  <AppText className="text-xs text-muted">{fmtTime(t.lastAt)}</AppText>
                </View>
                <AppText className="mt-1 text-sm text-muted" numberOfLines={1}>
                  {t.lastText}
                </AppText>
              </View>
            </Pressable>
          ))}

          {empty && (
            <View className="mt-16 items-center justify-center px-10">
              <Ionicons name="chatbubbles-outline" size={48} color="#9ca3af" />
              <AppText className="mt-3 text-center text-base text-muted">
                Hozircha suhbatlar yoʻq
              </AppText>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
