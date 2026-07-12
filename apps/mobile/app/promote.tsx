import { api } from '@halolmia/backend/convex/_generated/api';
import type { Id } from '@halolmia/backend/convex/_generated/dataModel';
import { Ionicons } from '@expo/vector-icons';
import { useAction, useQuery } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/app-text';
import { BRAND_BLUE } from '../constants/theme';
import { useAuth } from '../lib/auth';
import { browserCheckoutUrl } from '../lib/checkout-url';

// Map the UI payment button to PayTech/inPAY payment_method values.
const METHOD_MAP: Record<string, string> = { click: 'click', payme: 'payme', uzcard: 'atmos' };
type PromoTier = 'alo' | 'zor' | 'vip' | 'lux';

type Tier = {
  id: string;
  badge: string;
  badgeColor: string;
  price: string;
  features?: string[];
  featured?: boolean;
};

const TIERS: Tier[] = [
  { id: 'vip', badge: 'VIP', badgeColor: '#EF4444', price: '51 000', features: ['56 marta birinchi oʻrinda', '28 kun TOPda'] },
  { id: 'lux', badge: 'LUX', badgeColor: BRAND_BLUE, price: '102 000', featured: true },
  { id: 'zor', badge: "ZOʻR", badgeColor: '#F59E0B', price: '29 000' },
  { id: 'alo', badge: "AʼLO", badgeColor: '#9CA3AF', price: '6 000' },
];

const PAYMENTS = [
  { id: 'uzcard', label: 'Uzcard/Humo', color: '#1E3A8A' },
  { id: 'payme', label: 'Payme', color: '#33CCCC' },
  { id: 'click', label: 'Click', color: BRAND_BLUE },
];

const tap = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
};

export default function Promote() {
  const router = useRouter();
  const { listingId } = useLocalSearchParams<{ listingId?: string }>();
  const { userId } = useAuth();
  const [selected, setSelected] = useState<PromoTier>('vip');
  const [payOpen, setPayOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const createPromoteInvoice = useAction(api.inpay.createPromoteInvoice);

  // Admin controls which payment methods are enabled.
  const settings = useQuery(api.settings.get);
  const enabledPayments = PAYMENTS.filter((p) => {
    if (!settings) return true;
    if (p.id === 'payme') return settings.payme;
    if (p.id === 'click') return settings.click;
    if (p.id === 'uzcard') return settings.uzcard;
    return true;
  });

  const tier = TIERS.find((t) => t.id === selected)!;

  // Pay for the selected plan via inPAY. The boost is applied server-side once
  // the payment webhook is verified (inpay.markPaid), so we just open checkout.
  const pay = async (methodId: string) => {
    if (busy) return;
    if (!userId || !listingId) {
      setPayOpen(false);
      router.replace('/review');
      return;
    }
    setBusy(true);
    try {
      const { payUrl } = await createPromoteInvoice({
        userId,
        listingId: listingId as Id<'listings'>,
        tier: selected,
        method: METHOD_MAP[methodId] ?? 'inPAY',
      });
      setPayOpen(false);
      await WebBrowser.openBrowserAsync(browserCheckoutUrl(payUrl));
      router.replace('/review');
    } catch (e) {
      Alert.alert('Xatolik', e instanceof Error ? e.message : 'Toʻlovni yaratib boʻlmadi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        {/* Header */}
        <View className="h-12 flex-row items-center justify-end px-4">
          <Pressable onPress={() => router.replace('/review')} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
            <AppText className="font-medium text-base" style={{ color: BRAND_BLUE }}>Oʻtkazish</AppText>
          </Pressable>
        </View>

        {/* Progress (full) */}
        <View className="mx-4 mb-4 h-1.5 overflow-hidden rounded-full bg-surface-secondary">
          <View className="h-full rounded-full" style={{ width: '100%', backgroundColor: BRAND_BLUE }} />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
        >
          <AppText className="mb-5 font-display text-4xl text-foreground">Sotuvni tezlashtiring</AppText>

          {TIERS.map((t) => {
            const active = selected === t.id;
            const card = (
              <Pressable
                key={t.id}
                onPress={() => { tap(); setSelected(t.id as PromoTier); }}
                className="mb-3 rounded-2xl p-4"
                style={{
                  backgroundColor: active ? BRAND_BLUE + '12' : '#F1F3F5',
                  borderWidth: active ? 2 : 0,
                  borderColor: BRAND_BLUE,
                }}
              >
                <View className="flex-row items-center">
                  <View className="mr-3 rounded-lg px-2.5 py-1" style={{ backgroundColor: t.badgeColor }}>
                    <AppText className="text-sm font-bold" style={{ color: t.badge === "AʼLO" ? '#374151' : '#fff' }}>{t.badge}</AppText>
                  </View>
                  <AppText className="flex-1 font-bold text-lg text-foreground">{t.price} soʻm</AppText>
                  <Radio active={active} />
                </View>
                {t.features && (
                  <View className="mt-3 gap-1.5">
                    {t.features.map((f) => (
                      <View key={f} className="flex-row items-center">
                        <Ionicons name="checkmark" size={18} color={BRAND_BLUE} />
                        <AppText className="ml-2 text-base text-foreground">{f}</AppText>
                      </View>
                    ))}
                  </View>
                )}
              </Pressable>
            );

            // Featured tier gets the "stand out" banner wrapper
            if (t.featured) {
              return (
                <View key={t.id} className="mb-3 overflow-hidden rounded-2xl">
                  <LinearGradient colors={['#1E40AF', BRAND_BLUE]} style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
                    <AppText className="font-semibold text-base text-white">Boshqalardan ajralib turing!</AppText>
                  </LinearGradient>
                  <Pressable
                    onPress={() => { tap(); setSelected(t.id as PromoTier); }}
                    className="flex-row items-center bg-white p-4"
                    style={{ borderWidth: 2, borderColor: '#1E40AF', borderTopWidth: 0 }}
                  >
                    <View className="mr-3 rounded-lg px-2.5 py-1" style={{ backgroundColor: t.badgeColor }}>
                      <AppText className="text-sm font-bold text-white">{t.badge}</AppText>
                    </View>
                    <AppText className="flex-1 font-bold text-lg text-foreground">{t.price} soʻm</AppText>
                    <Radio active={active} />
                  </Pressable>
                </View>
              );
            }
            return card;
          })}
        </ScrollView>

        {/* CTA */}
        <View className="border-t border-border bg-background px-4 pb-2 pt-3">
          <Pressable
            onPress={() => { tap(); setPayOpen(true); }}
            className="h-14 items-center justify-center rounded-2xl active:opacity-90"
            style={{ backgroundColor: BRAND_BLUE }}
          >
            <AppText className="font-semibold text-base text-white">{tier.price} soʻmga reklama qilish</AppText>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Payment sheet */}
      <Modal visible={payOpen} transparent animationType="slide" onRequestClose={() => setPayOpen(false)}>
        <Pressable className="flex-1 bg-black/40" onPress={() => setPayOpen(false)} />
        <View className="rounded-t-3xl bg-background px-5 pb-8 pt-5">
          <View className="mb-5 flex-row items-center justify-between">
            <AppText className="font-bold text-xl text-foreground">Toʻlov usullari</AppText>
            <Pressable onPress={() => setPayOpen(false)} hitSlop={10}>
              <Ionicons name="close" size={26} color="#9ca3af" />
            </Pressable>
          </View>
          <View className="gap-3">
            {enabledPayments.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => pay(p.id)}
                disabled={busy}
                className="h-16 flex-row items-center rounded-2xl border border-border bg-surface px-4 active:opacity-70"
                style={{ opacity: busy ? 0.5 : 1 }}
              >
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: p.color }}>
                  <AppText className="font-bold text-sm text-white">{p.label.slice(0, 1)}</AppText>
                </View>
                <View className="flex-1">
                  <AppText className="font-semibold text-base text-foreground">{p.label}</AppText>
                  <AppText className="mt-0.5 text-xs text-muted">Xavfsiz checkout</AppText>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </Pressable>
            ))}
          </View>
          {busy && (
            <View className="mt-3 flex-row items-center justify-center">
              <ActivityIndicator color={BRAND_BLUE} />
              <AppText className="ml-2 text-sm text-muted">Toʻlov ochilmoqda...</AppText>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

function Radio({ active }: { active: boolean }) {
  return (
    <View className="h-6 w-6 items-center justify-center rounded-full border-2"
      style={{ borderColor: active ? BRAND_BLUE : '#d1d5db', backgroundColor: active ? BRAND_BLUE : 'transparent' }}>
      {active && <Ionicons name="checkmark" size={15} color="white" />}
    </View>
  );
}
