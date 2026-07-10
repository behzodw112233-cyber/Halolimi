import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, View } from 'react-native';
import { AppText } from '../components/app-text';
import { BRAND_BLUE } from '../constants/theme';
import { useAuth } from '../lib/auth';

/** Branded launch screen — blue, matches the app icon. Shown while auth hydrates. */
function BrandSplash() {
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fade, rise]);

  return (
    <View className="flex-1 items-center justify-center" style={{ backgroundColor: BRAND_BLUE }}>
      <Animated.View style={{ opacity: fade, transform: [{ translateY: rise }] }} className="items-center">
        {/* Wordmark with the green check badge, echoing the app icon */}
        <View className="flex-row items-start">
          <AppText style={{ fontFamily: 'Fredoka-SemiBold', fontSize: 56, color: '#fff', lineHeight: 62 }}>
            H
          </AppText>
          <AppText style={{ fontFamily: 'Fredoka-SemiBold', fontSize: 40, color: '#fff', lineHeight: 62 }}>
            alolmi
          </AppText>
          <View
            className="ml-1 mt-2 h-6 w-6 items-center justify-center rounded-full"
            style={{ backgroundColor: '#22C55E' }}
          >
            <Ionicons name="checkmark" size={16} color="#fff" />
          </View>
        </View>
        <AppText className="mt-3 text-center text-base" style={{ color: '#ffffffCC', fontFamily: 'Inter-Medium' }}>
          Ishonchli hayvonlar bozori
        </AppText>
      </Animated.View>

      <View className="absolute bottom-16">
        <ActivityIndicator color="#ffffffAA" />
      </View>
    </View>
  );
}

/**
 * Entry point. Once a user has been through onboarding (or logged in) we send
 * them straight to the feed; otherwise we start the language / intro flow.
 * The branded splash always shows briefly so launch feels intentional.
 */
export default function Index() {
  const { loading, onboarded } = useAuth();
  const [minElapsed, setMinElapsed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), 1400);
    return () => clearTimeout(t);
  }, []);

  if (loading || !minElapsed) return <BrandSplash />;

  return <Redirect href={onboarded ? '/home' : '/language'} />;
}
