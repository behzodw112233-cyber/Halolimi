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
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/app-text';
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
  const consumeSession = useMutation(api.authTelegram.consume);
  const [tgToken, setTgToken] = useState<string | null>(null);
  const tgStatus = useQuery(
    api.authTelegram.status,
    tgToken ? { token: tgToken } : 'skip'
  );

  const digits = phone.replace(/\D/g, '');
  const valid = digits.length >= 9 && name.trim().length >= 2;

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
      setTimeout(() => setTgToken(null), 0);
    }
  };

  // The bot verified the contact → log in automatically.
  useEffect(() => {
    if (tgToken && tgStatus?.status === 'verified') {
      const token = tgToken;
      setTgToken(null);
      consumeSession({ token })
        .then((userId) => adoptSession(userId as Id<'users'>))
        .then(() => router.replace('/home'))
        .catch(() => {
          Alert.alert('Xatolik', "Telegram kirish sessiyasi ishlamadi. Qayta urinib ko'ring.");
        });
    } else if (tgStatus?.status === 'expired') {
      setTimeout(() => setTgToken(null), 0);
      Alert.alert('Muddati tugadi', 'Telegram orqali kirish muddati tugadi. Qayta urinib koʻring.');
    }
  }, [tgStatus, tgToken, consumeSession, adoptSession, router]);

  const waitingTelegram = !!tgToken && tgStatus?.status === 'pending';

  useEffect(() => {
    if (!tgToken) return;
    const timer = setTimeout(() => {
      setTgToken(null);
      Alert.alert('Muddati tugadi', "Telegram orqali kirish muddati tugadi. Qayta urinib ko'ring.");
    }, 5 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [tgToken]);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <View style={styles.header}>
              <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={BRAND_BLUE} />
              </Pressable>
            </View>

            <View style={styles.card}>
              <AppText style={styles.brand}>Halolmi</AppText>
              <AppText style={styles.title}>Kirish</AppText>
              <AppText style={styles.subtitle}>
                Telefon raqamingizni kiriting yoki Telegram orqali kiring.
                Telegram orqali kirish sizni tasdiqlangan sotuvchi qiladi.
              </AppText>

              <AppText style={styles.label}>Ismingiz</AppText>
              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={20} color="#9ca3af" />
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Ismingiz"
                  placeholderTextColor="#9ca3af"
                  style={styles.input}
                />
              </View>

              <AppText style={styles.label}>Telefon raqam</AppText>
              <View style={styles.inputWrap}>
                <AppText style={styles.prefix}>+998</AppText>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="90 123 45 67"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                  style={styles.input}
                />
              </View>

              <Pressable
                onPress={submit}
                disabled={!valid || busy}
                style={[styles.primaryButton, { backgroundColor: valid ? BRAND_BLUE : '#C7D2DE' }]}
              >
                <AppText style={styles.buttonText}>
                  {busy ? 'Kutilmoqda...' : 'Davom etish'}
                </AppText>
              </Pressable>

              <View style={styles.divider}>
                <View style={styles.line} />
                <AppText style={styles.dividerText}>yoki</AppText>
                <View style={styles.line} />
              </View>

              <Pressable
                onPress={startTelegram}
                disabled={waitingTelegram}
                style={[styles.telegramButton, { opacity: waitingTelegram ? 0.7 : 1 }]}
              >
                {waitingTelegram ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Ionicons name="paper-plane" size={20} color="#fff" />
                )}
                <AppText style={styles.telegramText}>
                  {waitingTelegram ? 'Telegram tasdiqlanmoqda...' : 'Telegram orqali kirish'}
                </AppText>
              </Pressable>
              <AppText style={styles.telegramHint}>
                Telegram raqami ulansa — «Tasdiqlangan sotuvchi» belgisi beriladi
              </AppText>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F4F5F7',
  },
  safe: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  header: {
    height: 52,
    justifyContent: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  brand: {
    fontFamily: 'Fredoka-SemiBold',
    fontSize: 24,
    color: '#0F172A',
  },
  title: {
    marginTop: 22,
    fontFamily: 'Inter-Bold',
    fontSize: 30,
    color: '#0F172A',
  },
  subtitle: {
    marginTop: 8,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 24,
    color: '#6B7280',
  },
  label: {
    marginTop: 22,
    marginBottom: 8,
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#6B7280',
  },
  inputWrap: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#F1F3F5',
    paddingHorizontal: 16,
  },
  prefix: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#0F172A',
  },
  input: {
    flex: 1,
    marginLeft: 10,
    paddingVertical: 14,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#0F172A',
  },
  primaryButton: {
    height: 56,
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  buttonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  divider: {
    marginVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 12,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#6B7280',
  },
  telegramButton: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#229ED9',
  },
  telegramText: {
    marginLeft: 8,
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  telegramHint: {
    marginTop: 10,
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 17,
    color: '#64748B',
    textAlign: 'center',
  },
});
