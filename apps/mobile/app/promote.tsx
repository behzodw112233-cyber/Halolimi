import { api } from '@halolmia/backend/convex/_generated/api';
import type { Id } from '@halolmia/backend/convex/_generated/dataModel';
import { Ionicons } from '@expo/vector-icons';
import { useAction, useMutation, useQuery } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmbeddedStripeCheckout } from '../components/embedded-stripe-checkout';
import { AppText } from '../components/app-text';
import { BRAND_BLUE } from '../constants/theme';
import { useAuth } from '../lib/auth';
import { browserCheckoutUrl } from '../lib/checkout-url';

// Stripe Checkout is the active test gateway. Method is kept for API
// compatibility with the previous payment sheet.
const METHOD_MAP: Record<string, string> = { stripe: 'stripe' };
type PromoTier = 'alo' | 'zor' | 'vip' | 'lux';

type Tier = {
  id: string;
  badge: string;
  badgeColor: string;
  price: string;
  priceUzs?: number;
  features?: string[];
  featured?: boolean;
};

const TIERS: Tier[] = [
  { id: 'vip', badge: 'VIP', badgeColor: '#EF4444', price: '51 000', features: ['56 marta birinchi oʻrinda', '28 kun TOPda'] },
  { id: 'lux', badge: 'LUX', badgeColor: BRAND_BLUE, price: '102 000', featured: true },
  { id: 'zor', badge: "ZOʻR", badgeColor: '#F59E0B', price: '29 000' },
  { id: 'alo', badge: "AʼLO", badgeColor: '#9CA3AF', price: '6 000' },
];

const PAYMENTS = [{ id: 'stripe', label: 'Stripe test card', color: '#635BFF' }];
const CLIENT_TIER_PRICE: Record<PromoTier, number> = {
  alo: 6000,
  zor: 29000,
  vip: 51000,
  lux: 102000,
};

const tap = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
};

export default function Promote() {
  const router = useRouter();
  const { listingId } = useLocalSearchParams<{ listingId?: string }>();
  const { userId } = useAuth();
  const user = useQuery(api.users.get, userId ? { id: userId } : 'skip');
  const [selected, setSelected] = useState<PromoTier>('vip');
  const [payOpen, setPayOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const payInFlightRef = useRef(false);

  const createPromoteInvoice = useAction(api.stripe.createPromoteInvoice);
  const refreshInvoice = useAction(api.stripe.refreshInvoice);
  const promoteWithBalance = useMutation(api.stripe.promoteWithBalance);

  const enabledPayments = PAYMENTS;

  const tier = TIERS.find((t) => t.id === selected)!;
  const tierPrice = CLIENT_TIER_PRICE[selected];
  const balance = user?.balance ?? 0;
  const canUseBalance = balance >= tierPrice;
  const missingBalance = Math.max(0, tierPrice - balance);

  // Pay for the selected plan via Stripe. The boost is applied server-side once
  // the payment webhook is verified server-side, so we just open checkout.
  const payFromBalance = async () => {
    if (busy || payInFlightRef.current || clientSecret) return;
    if (!userId || !listingId) {
      setPayOpen(false);
      router.replace('/review');
      return;
    }
    if (!canUseBalance) return;
    payInFlightRef.current = true;
    setBusy(true);
    try {
      await promoteWithBalance({
        userId,
        listingId: listingId as Id<'listings'>,
        tier: selected,
      });
      setPayOpen(false);
      Alert.alert('Reklama yoqildi', 'Tarif hisobingizdan tolandi va elon reklamada.');
      router.replace('/review');
    } catch (e) {
      Alert.alert('Xatolik', e instanceof Error ? e.message : 'Hisobdan tolab bolmadi.');
    } finally {
      payInFlightRef.current = false;
      setBusy(false);
    }
  };

  const pay = async (methodId: string) => {
    if (busy || payInFlightRef.current || clientSecret) return;
    if (!userId || !listingId) {
      setPayOpen(false);
      router.replace('/review');
      return;
    }
    payInFlightRef.current = true;
    setBusy(true);
    try {
      const result = await createPromoteInvoice({
        userId,
        listingId: listingId as Id<'listings'>,
        tier: selected,
        method: METHOD_MAP[methodId] ?? 'stripe',
        embedded: Platform.OS === 'web',
      });
      if (Platform.OS === 'web') {
        if (!result.clientSecret) throw new Error('Stripe embedded checkout client secret topilmadi.');
        setOrderId(result.orderId);
        setClientSecret(result.clientSecret);
      } else if (result.payUrl) {
        setPayOpen(false);
        await WebBrowser.openBrowserAsync(browserCheckoutUrl(result.payUrl));
        router.replace('/review');
      }
    } catch (e) {
      Alert.alert('Xatolik', e instanceof Error ? e.message : 'Toʻlovni yaratib boʻlmadi.');
    } finally {
      payInFlightRef.current = false;
      setBusy(false);
    }
  };

  const closePayment = useCallback(() => {
    setClientSecret(null);
    setOrderId(null);
    setPayOpen(false);
  }, []);

  const completePayment = useCallback(async () => {
    if (orderId) await refreshInvoice({ orderId });
    setClientSecret(null);
    setOrderId(null);
    setPayOpen(false);
    router.replace('/review');
  }, [orderId, refreshInvoice, router]);

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
                <View
                  key={t.id}
                  className="mb-3 overflow-hidden rounded-2xl border bg-white"
                  style={{ borderColor: active ? BRAND_BLUE : '#E5E7EB', borderWidth: active ? 2 : 1 }}
                >
                  <LinearGradient colors={['#1E40AF', BRAND_BLUE]} style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
                    <AppText className="font-semibold text-base text-white">Boshqalardan ajralib turing!</AppText>
                  </LinearGradient>
                  <Pressable
                    onPress={() => { tap(); setSelected(t.id as PromoTier); }}
                    className="flex-row items-center bg-white p-4 active:opacity-80"
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
      <Modal visible={payOpen} transparent animationType="slide" onRequestClose={closePayment}>
        <View className="flex-1 justify-end bg-black/40">
        <Pressable className="absolute inset-0" onPress={closePayment} />
        <View className="max-h-[96vh] rounded-t-[28px] bg-background px-4 pb-3 pt-3 shadow-2xl md:px-5">
          <View className="mb-3 h-1 w-10 self-center rounded-full bg-border" />
          <View className="mb-3 flex-row items-center justify-between">
            <View>
              <AppText className="font-bold text-xl text-foreground">Toʻlov usuli</AppText>
              <AppText className="mt-0.5 text-xs text-muted">Reklamani faollashtirish</AppText>
            </View>
            <Pressable
              onPress={closePayment}
              hitSlop={10}
              className="h-9 w-9 items-center justify-center rounded-full bg-surface active:opacity-70"
            >
              <Ionicons name="close" size={21} color="#8B95A1" />
            </Pressable>
          </View>
          {!clientSecret ? (
            <View className="mb-3 flex-row items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3">
              <View className="flex-row items-center">
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: BRAND_BLUE + '14' }}>
                  <Ionicons name="megaphone-outline" size={19} color={BRAND_BLUE} />
                </View>
                <View>
                  <AppText className="font-semibold text-sm text-foreground">{tier.badge} paket</AppText>
                  <AppText className="mt-0.5 text-xs text-muted">Hisob: {balance.toLocaleString('ru-RU')} so'm</AppText>
                </View>
              </View>
              <AppText className="font-bold text-base" style={{ color: BRAND_BLUE }}>{tier.price} so'm</AppText>
            </View>
          ) : null}
          {clientSecret ? (
            <EmbeddedStripeCheckout
              clientSecret={clientSecret}
              onComplete={completePayment}
              onCancel={closePayment}
            />
          ) : (
          <View className="gap-3">
            <Pressable
              onPress={payFromBalance}
              disabled={busy || !canUseBalance}
              className="min-h-[76px] flex-row items-center rounded-2xl border bg-white px-4 py-3 active:opacity-70"
              style={{
                borderColor: canUseBalance ? BRAND_BLUE : '#E5E7EB',
                opacity: busy || !canUseBalance ? 0.6 : 1,
              }}
            >
              <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: canUseBalance ? BRAND_BLUE : '#E5E7EB' }}>
                <Ionicons name="wallet-outline" size={22} color={canUseBalance ? '#fff' : '#8B95A1'} />
              </View>
              <View className="flex-1">
                <AppText className="font-bold text-base text-foreground">Hisobdan to'lash</AppText>
                <AppText className="mt-0.5 text-xs" style={{ color: canUseBalance ? BRAND_BLUE : '#8B95A1' }}>
                  {canUseBalance
                    ? 'Yetarli mablag bor - darhol reklama yoqiladi'
                    : `${missingBalance.toLocaleString('ru-RU')} so'm yetmayapti`}
                </AppText>
              </View>
              {canUseBalance ? (
                <View className="ml-3 h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: BRAND_BLUE + '10' }}>
                  <Ionicons name="checkmark" size={19} color={BRAND_BLUE} />
                </View>
              ) : null}
            </Pressable>
            {enabledPayments.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => pay(p.id)}
                disabled={busy}
                className="min-h-[72px] flex-row items-center rounded-2xl border border-border bg-white px-4 py-3 active:opacity-70"
                style={{ opacity: busy ? 0.5 : 1 }}
              >
                <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: BRAND_BLUE }}>
                  <Ionicons name="card-outline" size={22} color="#fff" />
                </View>
                <View className="flex-1">
                  <AppText className="font-bold text-base text-foreground">
                    {canUseBalance ? 'Karta bilan tolash' : 'Karta bilan toldirish'}
                  </AppText>
                  <AppText className="mt-0.5 text-xs text-muted">
                    {canUseBalance ? 'Xohlasangiz Stripe test karta bilan ham tolang' : 'Yetmagan summa Stripe test karta orqali'}
                  </AppText>
                </View>
                <View className="ml-3 h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: BRAND_BLUE + '10' }}>
                  <Ionicons name="chevron-forward" size={19} color={BRAND_BLUE} />
                </View>
              </Pressable>
            ))}
          </View>
          )}
          {busy && (
            <View className="mt-3 flex-row items-center justify-center">
              <ActivityIndicator color={BRAND_BLUE} />
              <AppText className="ml-2 text-sm text-muted">Toʻlov ochilmoqda...</AppText>
            </View>
          )}
        </View>
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
