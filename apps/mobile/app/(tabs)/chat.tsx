import { Ionicons } from '@expo/vector-icons';
import { api } from '@halolmia/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/app-text';
import { BRAND_BLUE } from '../../constants/theme';
import { useAuth } from '../../lib/auth';

function ago(ms: number) {
  if (!ms) return '';
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return 'hozir';
  if (s < 3600) return `${Math.floor(s / 60)} daq`;
  if (s < 86400) return `${Math.floor(s / 3600)} soat`;
  if (s < 604800) return `${Math.floor(s / 86400)} kun`;
  const d = new Date(ms);
  return `${`${d.getDate()}`.padStart(2, '0')}.${`${d.getMonth() + 1}`.padStart(2, '0')}`;
}

export default function Chat() {
  const router = useRouter();
  const { userId } = useAuth();
  const threads = useQuery(api.messages.myThreads, userId ? { userId } : 'skip');
  const unreadTotal = threads?.reduce((sum, t) => sum + t.unread, 0) ?? 0;

  if (!userId) {
    return (
      <View className="flex-1" style={{ backgroundColor: '#EEF4FA' }}>
        <ScreenGlow />
        <SafeAreaView className="flex-1" edges={['top']}>
          <View className="px-4 pb-3 pt-2">
            <AppText className="font-display text-3xl text-[#0F172A]">Suhbatlar</AppText>
          </View>
          <View className="px-4 pt-5">
            <View
              className="items-center overflow-hidden rounded-[30px] border border-white/70 bg-white/65 px-5 py-7"
              style={styles.softShadow}
            >
              <BlurView intensity={34} tint="light" style={StyleSheet.absoluteFill} />
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: BRAND_BLUE + '1A' }}>
                <Ionicons name="chatbubbles-outline" size={32} color={BRAND_BLUE} />
              </View>
              <AppText className="mb-2 text-center font-bold text-xl text-foreground">
                Suhbatlar uchun kiring
              </AppText>
              <AppText className="mb-6 text-center text-base leading-6 text-muted">
                Sotuvchilar bilan yozishish va kelishuvlarni kuzatish uchun hisobingiz kerak.
              </AppText>
              <Pressable
                onPress={() => router.push('/login')}
                className="h-12 items-center justify-center rounded-2xl px-8 active:opacity-90"
                style={{ backgroundColor: BRAND_BLUE }}
              >
                <AppText className="font-semibold text-base text-white">Kirish</AppText>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: '#EEF4FA' }}>
      <ScreenGlow />
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="px-4 pb-3 pt-2">
          <View className="flex-row items-center justify-between">
            <View>
              <AppText className="text-xs font-semibold uppercase tracking-[1.4px] text-[#64748B]">Xabarlar</AppText>
              <AppText className="font-display text-3xl text-[#0F172A]">Suhbatlar</AppText>
            </View>
            <View className="h-11 min-w-11 items-center justify-center rounded-full border border-white/70 bg-white/60 px-3">
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={BRAND_BLUE} />
            </View>
          </View>

          <View
            className="mt-3 overflow-hidden rounded-[28px] border border-white/70 p-4"
            style={styles.heroCard}
          >
            <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(255,255,255,0.92)', 'rgba(255,255,255,0.20)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View className="absolute -right-10 -top-10 h-28 w-28 rounded-full" style={{ backgroundColor: BRAND_BLUE + '18' }} />
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <AppText className="font-bold text-lg text-[#0F172A]">Kelishuvlar markazi</AppText>
                <AppText className="mt-1 text-sm leading-5 text-[#64748B]">
                  Sotuvchilar bilan yozishmalar, narx kelishuvi va xavfsiz aloqa.
                </AppText>
              </View>
              <Stat label="suhbat" value={threads?.length ?? 0} />
              <View className="ml-2">
                <Stat label="yangi" value={unreadTotal} active={unreadTotal > 0} />
              </View>
            </View>
          </View>
        </View>

        {threads === undefined ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={BRAND_BLUE} />
          </View>
        ) : threads.length === 0 ? (
          <View className="flex-1 items-center px-8 pt-10">
            <View className="mb-6 h-28 w-28 items-center justify-center rounded-full border border-white/70 bg-white/70">
              <Ionicons name="chatbubble-ellipses-outline" size={56} color={BRAND_BLUE} />
            </View>
            <AppText className="mb-3 text-center font-bold text-2xl text-foreground">
              Hali suhbat yo'q
            </AppText>
            <AppText className="mb-10 text-center text-lg leading-7 text-muted">
              E'londagi "Narx?" yoki "Yozish" tugmasini bosing. Suhbat shu yerda ko'rinadi.
            </AppText>
            <Pressable
              onPress={() => router.push('/home')}
              className="h-14 w-full items-center justify-center rounded-2xl active:opacity-90"
              style={{ backgroundColor: BRAND_BLUE }}
            >
              <AppText className="font-semibold text-lg text-white">E'lonlarni ko'rish</AppText>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={threads}
            keyExtractor={(t) => t.threadId}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, paddingTop: 4 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/chat/[id]',
                    params: { id: item.threadId, name: item.otherName },
                  })
                }
                className="mb-3 flex-row items-center overflow-hidden rounded-[26px] border border-white/70 p-3 active:opacity-90"
                style={styles.threadCard}
              >
                <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
                <View className="mr-3">
                  <View className="items-center justify-center rounded-2xl" style={{ width: 52, height: 52, backgroundColor: BRAND_BLUE }}>
                    <AppText className="font-semibold text-lg text-white">
                      {item.otherName.charAt(0).toUpperCase()}
                    </AppText>
                  </View>
                  {item.online ? (
                    <View className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white" style={{ backgroundColor: '#22C55E' }} />
                  ) : null}
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <AppText className="flex-1 font-semibold text-base text-foreground" numberOfLines={1}>
                      {item.otherName}
                    </AppText>
                    <AppText className="ml-2 text-xs text-muted">{ago(item.lastAt)}</AppText>
                  </View>
                  <View className="mt-1 flex-row items-center justify-between">
                    <AppText
                      className={`flex-1 text-sm ${item.unread > 0 ? 'font-semibold text-foreground' : 'text-muted'}`}
                      numberOfLines={1}
                    >
                      {item.lastText || 'Suhbatni boshlang'}
                    </AppText>
                    {item.unread > 0 ? (
                      <View className="ml-2 h-5 min-w-5 items-center justify-center rounded-full px-1.5" style={{ backgroundColor: BRAND_BLUE }}>
                        <AppText className="text-xs font-bold text-white">{item.unread}</AppText>
                      </View>
                    ) : null}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </Pressable>
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

function Stat({ label, value, active = false }: { label: string; value: number; active?: boolean }) {
  return (
    <View className="items-center rounded-2xl bg-white/55 px-3 py-2">
      <AppText className="font-display text-2xl" style={{ color: active ? BRAND_BLUE : '#0F172A' }}>
        {value}
      </AppText>
      <AppText className="text-[11px] font-semibold text-[#64748B]">{label}</AppText>
    </View>
  );
}

function ScreenGlow() {
  return (
    <>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(10,108,255,0.22)', 'rgba(255,255,255,0)', 'rgba(15,23,42,0.08)']}
        locations={[0, 0.48, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View className="absolute -right-24 -top-20 h-72 w-72 rounded-full bg-white/70" />
      <View className="absolute -left-20 top-40 h-52 w-52 rounded-full" style={{ backgroundColor: BRAND_BLUE + '18' }} />
    </>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: 'rgba(255,255,255,0.62)',
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  softShadow: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  threadCard: {
    backgroundColor: 'rgba(255,255,255,0.68)',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
});
