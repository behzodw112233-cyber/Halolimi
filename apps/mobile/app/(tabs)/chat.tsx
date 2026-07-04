import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/app-text';
import { BRAND_BLUE } from '../../constants/theme';

interface Conversation {
  id: string;
  name: string;
  message: string;
  time: string;
  official?: boolean;
  unread?: number;
}

const CONVERSATIONS: Conversation[] = [
  {
    id: 'seller1',
    name: 'Alisher (sotuvchi)',
    message: 'Toshkent, Yunusobod. Istalgan vaqt keling.',
    time: '14:06',
    unread: 1,
  },
  {
    id: 'c1',
    name: 'Halolmi',
    message: '✅ Hayvonlarni oson qidirib toping',
    time: '19:25',
    official: true,
  },
];

export default function Chat() {
  const router = useRouter();
  return (
    <View className="flex-1 bg-background">
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="px-4 pb-2 pt-2">
          <AppText className="font-bold text-2xl text-foreground">Suhbatlar</AppText>
        </View>

        {CONVERSATIONS.length === 0 ? (
          <View className="flex-1 items-center justify-center px-10">
            <Ionicons name="chatbubbles-outline" size={48} color="#9ca3af" />
            <AppText className="mt-3 text-center text-base text-muted">
              Hozircha suhbatlar yoʻq
            </AppText>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {CONVERSATIONS.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => router.push({ pathname: '/chat/[id]', params: { id: c.id, name: c.name } })}
                className="flex-row items-center border-b border-border px-4 py-3 active:bg-surface-secondary"
              >
                {/* Avatar */}
                <View
                  className="mr-3 h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: c.official ? BRAND_BLUE : '#E5E7EB' }}
                >
                  {c.official ? (
                    <AppText
                      className="text-center text-white"
                      style={{ fontFamily: 'Fredoka-SemiBold', fontSize: 14, lineHeight: 16 }}
                    >
                      Halol{'\n'}mi
                    </AppText>
                  ) : (
                    <Ionicons name="person" size={26} color="#9ca3af" />
                  )}
                </View>

                <View className="flex-1">
                  <View className="flex-row items-center">
                    <AppText className="font-semibold text-base text-foreground">
                      {c.name}
                    </AppText>
                    {c.official && (
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={BRAND_BLUE}
                        style={{ marginLeft: 4 }}
                      />
                    )}
                    <View className="flex-1" />
                    <AppText className="text-xs text-muted">{c.time}</AppText>
                  </View>
                  <View className="mt-1 flex-row items-center">
                    <AppText className="flex-1 text-sm text-muted" numberOfLines={1}>
                      {c.message}
                    </AppText>
                    {!!c.unread && (
                      <View
                        className="ml-2 h-5 min-w-5 items-center justify-center rounded-full px-1.5"
                        style={{ backgroundColor: BRAND_BLUE }}
                      >
                        <AppText className="text-xs font-semibold text-white">{c.unread}</AppText>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}
