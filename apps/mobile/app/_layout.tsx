import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from '@expo-google-fonts/fredoka';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { HeroUINativeProvider } from 'heroui-native';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Uniwind } from 'uniwind';
import { ConvexClientProvider } from '../components/convex-provider';
import { IncomingCallOverlay } from '../components/incoming-call';
import { AuthProvider } from '../lib/auth';
import { LocationProvider } from '../lib/location';
import { PushManager } from '../lib/push';
import '../global.css';

// Keep the branded splash on screen until fonts are ready — otherwise the user
// stares at a blank white screen while the (slow, dev-mode) JS bundle boots.
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 300, fade: true });
Uniwind.setTheme('light');

export default function RootLayout() {
  // Keys must match the font-family names referenced in global.css.
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'SpaceGrotesk-Medium': SpaceGrotesk_500Medium,
    'SpaceGrotesk-Bold': SpaceGrotesk_700Bold,
    'Fredoka-Medium': Fredoka_500Medium,
    'Fredoka-SemiBold': Fredoka_600SemiBold,
    'Fredoka-Bold': Fredoka_700Bold,
  });

  // Hide the splash only once fonts resolve (or fail) — never leave it stuck.
  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync('#F4F5F7').catch(() => {});
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
      <ConvexClientProvider>
      <AuthProvider>
      <LocationProvider>
      <HeroUINativeProvider config={{ devInfo: { stylingPrinciples: false } }}>
        <PushManager />
        <IncomingCallOverlay />
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="language" />
          <Stack.Screen name="intent" />
          <Stack.Screen name="login" />
          <Stack.Screen name="search" />
          <Stack.Screen name="sell" />
          <Stack.Screen name="create" />
          <Stack.Screen name="reels" />
          <Stack.Screen name="video-create" />
          <Stack.Screen name="promote" />
          <Stack.Screen name="review" />
          <Stack.Screen name="listing/[id]" />
          <Stack.Screen name="dealer/[id]" />
          <Stack.Screen name="chat/[id]" />
          <Stack.Screen name="call/[id]" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="settings" />
        </Stack>
      </HeroUINativeProvider>
      </LocationProvider>
      </AuthProvider>
      </ConvexClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
