import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/app-text';
import { BRAND_BLUE } from '../constants/theme';

type Sheet = 'language' | 'currency' | 'about' | 'terms' | null;

const PREF_KEY = 'halolmi_preferences';
const languageLabels = { uz: "O'zbekcha", ru: 'Ruscha' } as const;
const currencyLabels = { usd: 'Shartli birliklar (y.e.)', uzs: "So'm (UZS)" } as const;

type Preferences = { language: keyof typeof languageLabels; currency: keyof typeof currencyLabels };

async function readPreferences(): Promise<Preferences> {
  try {
    const raw = Platform.OS === 'web' ? globalThis.localStorage?.getItem(PREF_KEY) : await SecureStore.getItemAsync(PREF_KEY);
    return { language: 'uz', currency: 'usd', ...(raw ? JSON.parse(raw) : {}) };
  } catch { return { language: 'uz', currency: 'usd' }; }
}

async function savePreferences(value: Preferences) {
  const raw = JSON.stringify(value);
  if (Platform.OS === 'web') globalThis.localStorage?.setItem(PREF_KEY, raw);
  else await SecureStore.setItemAsync(PREF_KEY, raw);
}

export default function Settings() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<Preferences>({ language: 'uz', currency: 'usd' });
  const [sheet, setSheet] = useState<Sheet>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshText, setRefreshText] = useState('');

  useEffect(() => { void readPreferences().then(setPreferences); }, []);

  const updatePreference = async (change: Partial<Preferences>) => {
    const next = { ...preferences, ...change };
    setPreferences(next);
    await savePreferences(next);
    setSheet(null);
  };

  const refresh = () => {
    if (refreshing) return;
    setRefreshing(true); setRefreshText('Ma\'lumotlar yangilanmoqda...');
    setTimeout(() => { setRefreshing(false); setRefreshText('Ma\'lumotlar yangilandi'); }, 800);
  };

  const rows = [
    { id: 'language', title: 'Til', value: languageLabels[preferences.language], onPress: () => setSheet('language') },
    { id: 'currency', title: 'Valyuta', value: currencyLabels[preferences.currency], onPress: () => setSheet('currency') },
    { id: 'refresh', title: refreshing ? 'Yangilanmoqda...' : 'Ma\'lumotlar bazasini yangilash', value: refreshText || undefined, onPress: refresh },
    { id: 'about', title: 'Ilova haqida', onPress: () => setSheet('about') },
    { id: 'terms', title: 'Foydalanuvchi shartnomasi', onPress: () => setSheet('terms') },
  ];

  return <View className="flex-1 bg-background">
    <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
      <View className="h-14 flex-row items-center border-b border-border px-3">
        <Pressable onPress={() => router.back()} hitSlop={12} className="h-9 w-9 items-center justify-center rounded-full" style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
          <Ionicons name="arrow-back" size={24} color={BRAND_BLUE} />
        </Pressable>
        <AppText className="ml-1 font-bold text-xl text-foreground">Sozlamalar</AppText>
      </View>
      <View>
        {rows.map((row) => <Pressable key={row.id} onPress={row.onPress} className="flex-row items-center border-b border-border px-5 py-4 active:bg-surface-secondary">
          <View className="flex-1"><AppText className="text-lg text-foreground">{row.title}</AppText>{row.value ? <AppText className="mt-0.5 text-sm text-muted">{row.value}</AppText> : null}</View>
          {row.id === 'refresh' && refreshing ? <ActivityIndicator color={BRAND_BLUE} /> : <Ionicons name="chevron-forward" size={20} color="#94A3B8" />}
        </Pressable>)}
      </View>
    </SafeAreaView>

    <Modal visible={sheet !== null} transparent animationType="slide" onRequestClose={() => setSheet(null)}>
      <Pressable className="flex-1 bg-black/40" onPress={() => setSheet(null)} />
      <View className="max-h-[78%] rounded-t-3xl bg-white px-5 pb-8 pt-5">
        <View className="mb-5 flex-row items-center justify-between">
          <AppText className="font-bold text-xl text-[#0F172A]">{sheet === 'language' ? 'Tilni tanlang' : sheet === 'currency' ? 'Valyutani tanlang' : sheet === 'about' ? 'Halolmi haqida' : 'Foydalanuvchi shartnomasi'}</AppText>
          <Pressable onPress={() => setSheet(null)} hitSlop={10}><Ionicons name="close" size={24} color="#64748B" /></Pressable>
        </View>
        {sheet === 'language' ? <View className="gap-2">{Object.entries(languageLabels).map(([id, label]) => <Choice key={id} label={label} active={preferences.language === id} onPress={() => void updatePreference({ language: id as Preferences['language'] })} />)}</View> : null}
        {sheet === 'currency' ? <View className="gap-2">{Object.entries(currencyLabels).map(([id, label]) => <Choice key={id} label={label} active={preferences.currency === id} onPress={() => void updatePreference({ currency: id as Preferences['currency'] })} />)}</View> : null}
        {sheet === 'about' ? <View><AppText className="text-base leading-6 text-[#475569]">Halolmi hayvonlar bozori uchun ishonchli e'lonlar ilovasi.</AppText><AppText className="mt-4 text-sm text-[#64748B]">Versiya 1.0.0</AppText></View> : null}
        {sheet === 'terms' ? <ScrollView showsVerticalScrollIndicator={false}><AppText className="text-base leading-6 text-[#475569]">Halolmi orqali e'lon joylashtirishda ma'lumotlaringiz to'g'ri va qonuniy bo'lishi kerak. Sotuvchi va xaridor o'rtasidagi kelishuv uchun tomonlar o'zlari javob beradi. Firibgarlik, noqonuniy mahsulotlar yoki noto'g'ri ma'lumotlar taqiqlanadi.</AppText><AppText className="mt-4 text-base leading-6 text-[#475569]">Xavfsizligingiz uchun to'lov va uchrashuvlarni tekshirib amalga oshiring. Qoidalar buzilganda e'lon yoki hisob cheklanishi mumkin.</AppText></ScrollView> : null}
      </View>
    </Modal>
  </View>;
}

function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} className="h-14 flex-row items-center justify-between rounded-2xl px-4" style={{ backgroundColor: active ? '#EAF2FF' : '#F8FAFC' }}>
    <AppText className="font-semibold text-base" style={{ color: '#0F172A' }}>{label}</AppText>
    {active ? <Ionicons name="checkmark-circle" size={22} color={BRAND_BLUE} /> : null}
  </Pressable>;
}
