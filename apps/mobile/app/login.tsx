import { Ionicons } from '@expo/vector-icons';
import { api } from '@halolmia/backend/convex/_generated/api';
import type { Id } from '@halolmia/backend/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/app-text';
import { Logo } from '../components/logo';
import { useAuth } from '../lib/auth';

const BRAND_BLUE = '#0A6CFF';
// Set EXPO_PUBLIC_BOT_USERNAME (without @) so the Telegram login deep link works.
const BOT_USERNAME = process.env.EXPO_PUBLIC_BOT_USERNAME ?? '';

/** Unguessable, short-lived login handshake token. */
function makeToken(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return (
    Math.random().toString(36).slice(2) +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2)
  );
}

export default function Login() {
  const router = useRouter();
  const { login, adoptSession } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  // Telegram login handshake.
  const startSession = useMutation(api.authTelegram.start);
  const [tgToken, setTgToken] = useState<string | null>(null);
  const tgStatus = useQuery(
    api.authTelegram.status,
    tgToken ? { token: tgToken } : 'skip'
  );

  const digits = phone.replace(/\D/g, '');
  const valid = digits.length >= 9;

  const submit = async () => {
    if (!valid || busy) return;
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
    setBusy(true);
    try {
      await login('+998' + digits.slice(-9), name.trim() || undefined);
      router.replace('/home');
    } finally {
      setBusy(false);
    }
  };

  const startTelegram = async () => {
    if (!BOT_USERNAME) {
      Alert.alert('Sozlanmagan', 'Telegram bot hali ulanmagan.');
      return;
    }
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
    const token = makeToken();
    try {
      await startSession({ token });
      setTgToken(token);
      await Linking.openURL(`https://t.me/${BOT_USERNAME}?start=${token}`);
    } catch {
      Alert.alert('Xatolik', 'Telegramni ochib boʻlmadi. Qayta urinib koʻring.');
      setTgToken(null);
    }
  };

  // The bot verified the contact → log in automatically.
  useEffect(() => {
    if (tgStatus?.status === 'verified' && tgStatus.userId) {
      adoptSession(tgStatus.userId as Id<'users'>).then(() => router.replace('/home'));
    } else if (tgStatus?.status === 'expired') {
      setTgToken(null);
      Alert.alert('Muddati tugadi', 'Telegram orqali kirish muddati tugadi. Qayta urinib koʻring.');
    }
  }, [tgStatus, adoptSession, router]);

  const waitingTelegram = !!tgToken && tgStatus?.status === 'pending';

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          className="flex-1 px-6"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Back */}
          <View className="h-12 flex-row items-center">
            <Pressable onPress={() => router.back()} hitSlop={10} className="h-9 w-9 items-center justify-center">
              <Ionicons name="arrow-back" size={24} color={BRAND_BLUE} />
            </Pressable>
          </View>

          <Logo className="mt-2 text-[#0F172A]" />

          <AppText className="mt-8 font-bold text-3xl text-foreground">
            Kirish
          </AppText>
          <AppText className="mt-2 text-base leading-6 text-muted">
            Telefon raqamingizni kiriting. Uni suhbat va eʼlonlaringiz uchun ishlatamiz.
          </AppText>

          {/* Name */}
          <AppText className="mb-2 mt-8 font-medium text-sm text-muted">Ismingiz</AppText>
          <View className="flex-row items-center rounded-2xl bg-surface-secondary px-4">
            <Ionicons name="person-outline" size={20} color="#9ca3af" />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ismingiz"
              placeholderTextColor="#9ca3af"
              className="ml-3 flex-1 py-4 text-base text-foreground"
              style={{ fontFamily: 'Inter-Regular' }}
            />
          </View>

          {/* Phone */}
          <AppText className="mb-2 mt-4 font-medium text-sm text-muted">Telefon raqam</AppText>
          <View className="flex-row items-center rounded-2xl bg-surface-secondary px-4">
            <AppText className="text-base text-foreground">🇺🇿 +998</AppText>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="90 123 45 67"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              className="ml-2 flex-1 py-4 text-base text-foreground"
              style={{ fontFamily: 'Inter-Regular' }}
            />
          </View>

          <View className="flex-1" />

          <Pressable
            onPress={submit}
            disabled={!valid || busy}
            className="h-14 items-center justify-center rounded-2xl active:opacity-90"
            style={{ backgroundColor: valid ? BRAND_BLUE : '#C7D2DE' }}
          >
            <AppText className="font-semibold text-base text-white">
              {busy ? 'Kutilmoqda...' : 'Davom etish'}
            </AppText>
          </Pressable>

          {/* Divider */}
          <View className="my-4 flex-row items-center">
            <View className="h-px flex-1 bg-border" />
            <AppText className="mx-3 text-sm text-muted">yoki</AppText>
            <View className="h-px flex-1 bg-border" />
          </View>

          {/* Telegram login */}
          <Pressable
            onPress={startTelegram}
            disabled={waitingTelegram}
            className="mb-4 h-14 flex-row items-center justify-center rounded-2xl active:opacity-90"
            style={{ backgroundColor: '#229ED9', opacity: waitingTelegram ? 0.7 : 1 }}
          >
            {waitingTelegram ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="paper-plane" size={20} color="#fff" />
            )}
            <AppText className="ml-2 font-semibold text-base text-white">
              {waitingTelegram ? 'Telegram tasdiqlanmoqda...' : 'Telegram orqali kirish'}
            </AppText>
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
