import { Ionicons } from '@expo/vector-icons';
import { api } from '@halolmia/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import { Tabs, useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, View, useWindowDimensions, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/app-text';
import { BRAND_BLUE } from '../../constants/theme';
import { useAuth } from '../../lib/auth';

/** Chat tab icon with a red unread-count badge, summed across all threads. */
function ChatTabIcon({ color, size }: { color: ColorValue; size: number }) {
  const { userId } = useAuth();
  const unread = useQuery(api.messages.unreadTotal, userId ? { userId } : 'skip') ?? 0;
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

function SellTabButton({ compact }: { compact: boolean }) {
  const router = useRouter();
  const size = compact ? 50 : 56;
  return (
    <View className="flex-1 items-center" style={{ minWidth: 0 }}>
      <Pressable
        onPress={() => router.push('/sell')}
        className="items-center justify-center active:opacity-80"
        hitSlop={{ top: 12, bottom: 10, left: 10, right: 10 }}
        style={{ width: '100%' }}
      >
        <View
          className="items-center justify-center rounded-full"
          style={[styles.sellBubble, { width: size, height: size, marginTop: compact ? -18 : -22 }]}
        >
          <Ionicons name="add" size={compact ? 28 : 31} color="white" />
        </View>
        <AppText
          className="mt-0.5 text-center"
          numberOfLines={1}
          style={{ color: BRAND_BLUE, fontFamily: 'Inter-SemiBold', fontSize: compact ? 10 : 11 }}
        >
          Sotish
        </AppText>
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const bottomInset = Math.max(insets.bottom, 6);
  const tabBarHeight = (compact ? 66 : 72) + bottomInset;
  const iconSize = compact ? 23 : 25;

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BRAND_BLUE,
        tabBarInactiveTintColor: '#9ca3af',
        tabBarHideOnKeyboard: true,
        tabBarStyle: [
          styles.tabBar,
          {
            height: tabBarHeight,
            paddingBottom: bottomInset,
            paddingTop: compact ? 6 : 8,
          },
        ],
        tabBarItemStyle: styles.tabItem,
        tabBarIconStyle: styles.tabIcon,
        tabBarLabelStyle: {
          fontSize: compact ? 10 : 11,
          lineHeight: compact ? 12 : 13,
          fontFamily: 'Inter-Medium',
          includeFontPadding: false,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Asosiy',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={Math.min(size, iconSize)} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saqlangan',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" size={Math.min(size, iconSize)} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="post"
        options={{ title: '', tabBarButton: () => <SellTabButton compact={compact} /> }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => <ChatTabIcon color={color} size={Math.min(size, iconSize)} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Kabinet',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={Math.min(size, iconSize)} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const tabBarShadow =
  Platform.OS === 'web'
    ? ({ boxShadow: '0 -6px 16px rgba(15, 23, 42, 0.10)' } as any)
    : {
        shadowColor: '#0F172A',
        shadowOpacity: 0.1,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: -6 },
        elevation: 14,
      };

const sellBubbleShadow =
  Platform.OS === 'web'
    ? ({ boxShadow: '0 6px 12px rgba(10, 108, 255, 0.18)' } as any)
    : {
        shadowColor: BRAND_BLUE,
        shadowOpacity: 0.24,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
      };

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 0,
    backgroundColor: 'rgba(255,255,255,0.96)',
    overflow: 'visible',
    ...tabBarShadow,
  },
  tabItem: {
    minWidth: 0,
    paddingHorizontal: 0,
  },
  tabIcon: {
    marginTop: 2,
    marginBottom: 1,
  },
  sellBubble: {
    backgroundColor: BRAND_BLUE,
    ...sellBubbleShadow,
  },
});
