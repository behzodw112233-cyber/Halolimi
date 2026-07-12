import { Ionicons } from '@expo/vector-icons';
import { api } from '@halolmia/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import { Tabs, useRouter } from 'expo-router';
import { Pressable, View, type ColorValue } from 'react-native';
import { AppText } from '../../components/app-text';
import { BRAND_BLUE } from '../../constants/theme';
import { useAuth } from '../../lib/auth';

/** Chat tab icon with a red unread-count badge, summed across all threads. */
function ChatTabIcon({ color, size }: { color: ColorValue; size: number }) {
  const { userId } = useAuth();
  const threads = useQuery(api.messages.myThreads, userId ? { userId } : 'skip');
  const unread = threads?.reduce((sum, t) => sum + t.unread, 0) ?? 0;
  return (
    <View>
      <Ionicons name="paper-plane-outline" size={size} color={color} />
      {unread > 0 ? (
        <View
          className="absolute items-center justify-center rounded-full bg-red-500 px-1"
          style={{ minWidth: 16, height: 16, right: -8, top: -6 }}
        >
          <AppText className="text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</AppText>
        </View>
      ) : null}
    </View>
  );
}

function SellTabButton() {
  const router = useRouter();
  return (
    <View className="flex-1 items-center justify-center">
      <Pressable
        onPress={() => router.push('/sell')}
        className="items-center justify-center active:opacity-80"
        hitSlop={8}
      >
        <View
          className="items-center justify-center rounded-full"
          style={{ width: 52, height: 52, backgroundColor: BRAND_BLUE, marginTop: -18 }}
        >
          <Ionicons name="add" size={30} color="white" />
        </View>
        <AppText className="mt-0.5 text-[11px]" style={{ color: BRAND_BLUE }}>
          Sotish
        </AppText>
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BRAND_BLUE,
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { height: 62, paddingBottom: 8, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11, fontFamily: 'Inter-Medium' },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Asosiy',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saqlangan',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="post"
        options={{ title: '', tabBarButton: () => <SellTabButton /> }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => <ChatTabIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Kabinet',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
