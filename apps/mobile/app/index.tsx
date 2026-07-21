import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { AppText } from '../components/app-text';
import { BRAND_BLUE } from '../constants/theme';
import { useAuth } from '../lib/auth';

const LAUNCH_MS = 1650;

function BrandSplash() {
  const hOpacity = useRef(new Animated.Value(0)).current;
  const hScale = useRef(new Animated.Value(0.55)).current;
  const hLift = useRef(new Animated.Value(26)).current;
  const wordOpacity = useRef(new Animated.Value(0)).current;
  const wordSlide = useRef(new Animated.Value(-18)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const checkSpin = useRef(new Animated.Value(-0.35)).current;
  const checkPulse = useRef(new Animated.Value(1)).current;
  const logoFloat = useRef(new Animated.Value(0)).current;
  const line = useRef(new Animated.Value(0)).current;
  const copyOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(hOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(hScale, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }),
        Animated.timing(hLift, { toValue: 0, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(wordOpacity, { toValue: 1, duration: 230, useNativeDriver: true }),
        Animated.timing(wordSlide, { toValue: 0, duration: 330, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(checkScale, { toValue: 1, friction: 5, tension: 130, useNativeDriver: true }),
        Animated.timing(checkSpin, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(copyOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.timing(line, { toValue: 0.72, duration: 540, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      ]),
      Animated.timing(line, { toValue: 1, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoFloat, { toValue: -3, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(logoFloat, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
      Animated.sequence([
        Animated.timing(checkPulse, { toValue: 1.18, duration: 150, useNativeDriver: true }),
        Animated.spring(checkPulse, { toValue: 1, friction: 4, tension: 170, useNativeDriver: true }),
      ]).start();
    });
  }, [checkPulse, checkScale, checkSpin, copyOpacity, hLift, hOpacity, hScale, line, logoFloat, wordOpacity, wordSlide]);

  const checkRotation = checkSpin.interpolate({ inputRange: [-0.35, 0], outputRange: ['-20deg', '0deg'] });
  const lineWidth = line.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View className="flex-1 items-center justify-center" style={{ backgroundColor: BRAND_BLUE }}>
      <View className="items-center">
        <Animated.View style={{ transform: [{ translateY: logoFloat }] }}>
          <View className="flex-row items-start">
            <Animated.View style={{ opacity: hOpacity, transform: [{ translateY: hLift }, { scale: hScale }] }}>
              <AppText style={{ fontFamily: 'Fredoka-SemiBold', fontSize: 58, lineHeight: 64, color: '#FFFFFF' }}>H</AppText>
            </Animated.View>
            <Animated.View style={{ opacity: wordOpacity, transform: [{ translateX: wordSlide }] }}>
              <AppText style={{ fontFamily: 'Fredoka-SemiBold', fontSize: 41, lineHeight: 64, color: '#FFFFFF' }}>alolmi</AppText>
            </Animated.View>
            <Animated.View
              className="ml-1 mt-2 h-7 w-7 items-center justify-center rounded-full"
              style={{ backgroundColor: '#22C55E', transform: [{ scale: Animated.multiply(checkScale, checkPulse) }, { rotate: checkRotation }] }}
            >
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            </Animated.View>
          </View>
        </Animated.View>
        <Animated.View style={{ opacity: copyOpacity }}>
          <AppText className="mt-3 text-center text-sm" style={{ color: '#D9E8FF', fontFamily: 'Inter-Medium' }}>
            Ishonchli hayvonlar bozori
          </AppText>
        </Animated.View>
      </View>

      <View className="absolute bottom-16 w-44">
        <View className="h-1 overflow-hidden rounded-full bg-white/25">
          <Animated.View className="h-full rounded-full bg-white" style={{ width: lineWidth }} />
        </View>
      </View>
    </View>
  );
}

export default function Index() {
  const { loading, onboarded } = useAuth();
  const [minElapsed, setMinElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinElapsed(true), LAUNCH_MS);
    return () => clearTimeout(timer);
  }, []);

  if (loading || !minElapsed) return <BrandSplash />;

  return <Redirect href={onboarded ? '/home' : '/language'} />;
}
