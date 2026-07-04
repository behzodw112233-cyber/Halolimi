import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { AppText } from '../../components/app-text';
import { BRAND_BLUE } from '../../constants/theme';

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
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="paper-plane-outline" size={size} color={color} />
          ),
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
