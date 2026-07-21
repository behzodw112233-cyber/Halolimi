import { api } from '@halolmia/backend/convex/_generated/api';
import type { Id } from '@halolmia/backend/convex/_generated/dataModel';
import { Ionicons } from '@expo/vector-icons';
import { useAction } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/app-text';
import { BRAND_BLUE } from '../constants/theme';
import { useAuth } from '../lib/auth';
import { StripeCardSheet } from '../components/stripe-card-sheet';

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

const tap = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
};

export default function Promote() {
  const router = useRouter();
  const { listingId } = useLocalSearchParams<{ listingId?: string }>();
  const { userId } = useAuth();
  const [selected, setSelected] = useState<PromoTier>('vip');
  const [busy, setBusy] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [cardClientSecret, setCardClientSecret] = useState<string | null>(null);

  const createPromotionPayment = useAction(api.jamgarma.createStripePromotionPayment);

  const tier = TIERS.find((t) => t.id === selected)!;

  const pay = async () => {
    if (busy) return;
    if (!userId || !listingId) {
      router.replace('/review');
      return;
    }
    setBusy(true);
    try {
      const payment = await createPromotionPayment({
        userId,
        listingId: listingId as Id<'listings'>,
        tier: selected,
      });
      if (!payment.ok) throw new Error("To'lovni yaratib bo'lmadi.");
      setCardClientSecret(payment.clientSecret);
      setCardOpen(true);
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
            onPress={() => { tap(); void pay(); }}
            className="h-14 items-center justify-center rounded-2xl active:opacity-90"
            style={{ backgroundColor: BRAND_BLUE }}
          >
            <AppText className="font-semibold text-base text-white">{tier.price} soʻmga reklama qilish</AppText>
          </Pressable>
        </View>
      </SafeAreaView>

      <StripeCardSheet
        visible={cardOpen}
        title={`${tier.badge} reklama`}
        amount={`${tier.price} so'm`}
        clientSecret={cardClientSecret}
        onClose={() => { setCardOpen(false); setCardClientSecret(null); }}
        onPaid={() => {
          setCardOpen(false);
          setCardClientSecret(null);
          Alert.alert("To'lov qabul qilindi", 'Reklama faollashdi.');
          router.replace('/review');
        }}
      />

      {/*
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
                onPress={() => void pay()}
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
      <StripeCardSheet
        visible={cardOpen}
        title={`${tier.badge} reklama`}
        amount={`${tier.price} so'm`}
        clientSecret={clientSecret}
        onClose={() => { setCardOpen(false); setClientSecret(null); }}
        onPaid={() => { setCardOpen(false); setClientSecret(null); Alert.alert("To'lov qabul qilindi", "Stripe tasdiqlagach reklama faollashadi."); router.replace('/review'); }}
      */}
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
