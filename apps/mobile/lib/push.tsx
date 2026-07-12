import { api } from '@halolmia/backend/convex/_generated/api';
import { useMutation } from 'convex/react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useAuth } from './auth';

// Show a banner + play a sound even when a notification arrives in the
// foreground (default behaviour is to stay silent while the app is open).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Route to the right screen when the user taps a notification. */
function handleTap(response: Notifications.NotificationResponse) {
  const data = response.notification.request.content.data as
    | { type?: string; listingId?: string; sellerId?: string; threadId?: string; callId?: string }
    | undefined;
  if (!data) return;
  if (data.type === 'listing' && data.listingId) {
    router.push({ pathname: '/listing/[id]', params: { id: String(data.listingId) } });
  } else if (data.type === 'review' && data.sellerId) {
    router.push({ pathname: '/seller/[id]', params: { id: String(data.sellerId) } });
  } else if (data.type === 'chat' && data.threadId) {
    router.push({ pathname: '/chat/[id]', params: { id: String(data.threadId) } });
  } else if (data.type === 'call' && data.callId) {
    router.push({ pathname: '/call/[id]', params: { id: String(data.callId), role: 'callee' } } as unknown as Href);
  }
}

/**
 * Registers this device for Expo push once a user is signed in, and wires the
 * tap handler. Renders nothing — mount it once, high in the tree. Requires the
 * dev/production build (push native module isn't in Expo Go).
 */
export function PushManager() {
  const { userId } = useAuth();
  const registerToken = useMutation(api.push.registerToken);
  const registeredFor = useRef<string | null>(null);

  // Register (or re-register) whenever the signed-in user changes.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!userId) return;
    if (registeredFor.current === userId) return;
    let cancelled = false;

    (async () => {
      if (!Device.isDevice) return; // simulators can't get a push token

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Halolmi',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
        });
      }

      const settings = await Notifications.getPermissionsAsync();
      let granted = settings.granted;
      if (!granted && settings.canAskAgain) {
        granted = (await Notifications.requestPermissionsAsync()).granted;
      }
      if (!granted || cancelled) return;

      try {
        // Native FCM registration token (Firebase). Our Convex backend sends
        // straight to FCM, so we register the device token, not an Expo token.
        const device = await Notifications.getDevicePushTokenAsync();
        const token = typeof device.data === 'string' ? device.data : String(device.data);
        if (cancelled || !token) return;
        await registerToken({ userId, token });
        registeredFor.current = userId;
      } catch {
        /* token fetch can fail offline / before Firebase is ready — retry next mount */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, registerToken]);

  // Handle taps: both a cold start (app opened from a notification) and taps
  // while the app is running.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleTap(response);
    });
    const sub = Notifications.addNotificationResponseReceivedListener(handleTap);
    return () => sub.remove();
  }, []);

  return null;
}
