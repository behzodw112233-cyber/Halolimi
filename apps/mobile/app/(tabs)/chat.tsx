import { Ionicons } from '@expo/vector-icons';
import { api } from '@halolmia/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/app-text';
import { BRAND_BLUE } from '../../constants/theme';
import { useAuth } from '../../lib/auth';

/** Short relative time in Uzbek: hozir / 5 daq / 3 soat / 2 kun / date. */
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

  // Not logged in → prompt.
  if (!userId) {
    return (
      <View className="flex-1 bg-background">
        <SafeAreaView className="flex-1" edges={['top']}>
          <View className="px-4 pb-2 pt-2">
            <AppText className="font-bold text-2xl text-foreground">Suhbatlar</AppText>
          </View>
          <View className="px-4 pt-8">
            <View className="items-center rounded-2xl bg-surface px-5 py-6">
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
    <View className="flex-1 bg-background">
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="px-4 pb-2 pt-2">
          <AppText className="font-bold text-2xl text-foreground">Suhbatlar</AppText>
        </View>

        {threads === undefined ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={BRAND_BLUE} />
          </View>
        ) : threads.length === 0 ? (
          <View className="flex-1 items-center px-8 pt-16">
            <View className="mb-6 h-28 w-28 items-center justify-center rounded-full" style={{ backgroundColor: BRAND_BLUE + '14' }}>
              <Ionicons name="chatbubble-ellipses-outline" size={56} color={BRAND_BLUE} />
            </View>
            <AppText className="mb-3 text-center font-bold text-2xl text-foreground">
              Hali suhbat yoʻq
            </AppText>
            <AppText className="mb-10 text-center text-lg leading-7 text-muted">
              Eʼlondagi «Narx?» yoki «Yozish» tugmasini bosing — suhbat shu yerda koʻrinadi.
            </AppText>
            <Pressable
              onPress={() => router.push('/home')}
              className="h-14 w-full items-center justify-center rounded-2xl active:opacity-90"
              style={{ backgroundColor: BRAND_BLUE }}
            >
              <AppText className="font-semibold text-lg text-white">Eʼlonlarni koʻrish</AppText>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={threads}
            keyExtractor={(t) => t.threadId}
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/chat/[id]',
                    params: { id: item.threadId, name: item.otherName },
                  })
                }
                className="flex-row items-center px-4 py-3 active:bg-surface-secondary"
              >
                <View className="mr-3">
                  <View className="h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: BRAND_BLUE }}>
                    <AppText className="font-semibold text-lg text-white">
                      {item.otherName.charAt(0).toUpperCase()}
                    </AppText>
                  </View>
                  {item.online && (
                    <View className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-background" style={{ backgroundColor: '#22C55E' }} />
                  )}
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <AppText className="flex-1 font-semibold text-base text-foreground" numberOfLines={1}>
                      {item.otherName}
                    </AppText>
                    <AppText className="ml-2 text-xs text-muted">{ago(item.lastAt)}</AppText>
                  </View>
                  <View className="mt-0.5 flex-row items-center justify-between">
                    <AppText
                      className={`flex-1 text-sm ${item.unread > 0 ? 'font-semibold text-foreground' : 'text-muted'}`}
                      numberOfLines={1}
                    >
                      {item.lastText || 'Suhbatni boshlang'}
                    </AppText>
                    {item.unread > 0 && (
                      <View className="ml-2 h-5 min-w-5 items-center justify-center rounded-full px-1.5" style={{ backgroundColor: BRAND_BLUE }}>
                        <AppText className="text-xs font-bold text-white">{item.unread}</AppText>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View className="ml-[68px] h-px bg-border" />}
          />
        )}
      </SafeAreaView>
    </View>
  );
}
