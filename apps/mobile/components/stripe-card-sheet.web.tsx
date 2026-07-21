import { Ionicons } from '@expo/vector-icons';
import { api } from '@halolmia/backend/convex/_generated/api';
import { useAction } from 'convex/react';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, View } from 'react-native';
import { AppText } from './app-text';
import { BRAND_BLUE } from '../constants/theme';

type StripeCard = {
  mount: (target: unknown) => void;
  on: (event: 'change', callback: (event: { complete?: boolean; error?: { message?: string } }) => void) => void;
  destroy: () => void;
};
type Stripe = {
  elements: () => { create: (type: 'card', options?: Record<string, unknown>) => StripeCard };
  confirmCardPayment: (secret: string, data: { payment_method: { card: StripeCard } }) => Promise<{ error?: { message?: string }; paymentIntent?: { id?: string } }>;
};

function loadStripe() {
  if ((window as unknown as { Stripe?: unknown }).Stripe) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://js.stripe.com/v3/"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Stripe yuklanmadi.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Stripe yuklanmadi.'));
    document.head.appendChild(script);
  });
}

export function StripeCardSheet({ visible, title, amount, clientSecret, onClose, onPaid }: {
  visible: boolean;
  title: string;
  amount: string;
  clientSecret: string | null;
  onClose: () => void;
  onPaid: () => void;
}) {
  const confirmStripePayment = useAction(api.jamgarma.confirmStripePayment);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const targetRef = useRef<unknown>(null);
  const cardRef = useRef<StripeCard | null>(null);
  const stripeRef = useRef<Stripe | null>(null);

  useEffect(() => {
    if (!visible || !clientSecret) return;
    let card: StripeCard | null = null;
    let cancelled = false;
    void (async () => {
      try {
        await loadStripe();
        const key = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
        const stripe = key ? (window as unknown as { Stripe?: (publishableKey: string) => Stripe }).Stripe?.(key) : undefined;
        if (!stripe) throw new Error('Stripe kaliti topilmadi.');
        if (cancelled) return;
        stripeRef.current = stripe;
        card = stripe.elements().create('card', { hidePostalCode: true });
        card.on('change', (event) => {
          setComplete(!!event.complete);
          setError(event.error?.message ?? null);
        });
        cardRef.current = card;
        card.mount(targetRef.current);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Karta formasi ochilmadi.');
      }
    })();
    return () => { cancelled = true; cardRef.current = null; card?.destroy(); };
  }, [clientSecret, visible]);

  const pay = async () => {
    if (!clientSecret || !stripeRef.current || !cardRef.current) return;
    setProcessing(true);
    setError(null);
    try {
      const result = await stripeRef.current.confirmCardPayment(clientSecret, { payment_method: { card: cardRef.current } });
      if (result.error) throw new Error(result.error.message ?? "To'lov o'tmadi.");
      const paymentIntentId = result.paymentIntent?.id ?? clientSecret.split('_secret_')[0];
      const settlement = await confirmStripePayment({ paymentIntentId });
      if (!settlement.ok) throw new Error(settlement.error);
      onPaid();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "To'lov o'tmadi.");
    } finally {
      setProcessing(false);
    }
  };

  return <CardModal visible={visible} title={title} amount={amount} error={error} processing={processing} disabled={!complete || !clientSecret} onClose={onClose} onPay={pay} targetRef={targetRef} />;
}

function CardModal({ visible, title, amount, error, processing, disabled, onClose, onPay, targetRef }: {
  visible: boolean; title: string; amount: string; error: string | null; processing: boolean; disabled: boolean; onClose: () => void; onPay: () => void; targetRef: React.RefObject<unknown>;
}) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View className="flex-1 items-center justify-center bg-black/40 px-5"><View className="w-full max-w-[390px] rounded-2xl bg-white p-5"><View className="mb-4 flex-row items-start justify-between"><View className="flex-1 pr-3"><AppText className="font-bold text-lg text-[#0F172A]">{title}</AppText><AppText className="mt-1 text-sm text-[#64748B]">{amount}</AppText></View><Pressable onPress={onClose} hitSlop={10} className="h-8 w-8 items-center justify-center rounded-full bg-[#F1F5F9]"><Ionicons name="close" size={18} color="#64748B" /></Pressable></View><View className="h-13 justify-center rounded-xl border border-[#CBD5E1] bg-white px-3" ref={targetRef as never} />{error ? <AppText className="mt-2 text-sm text-[#DC2626]">{error}</AppText> : null}<Pressable onPress={onPay} disabled={disabled || processing} className="mt-4 h-12 flex-row items-center justify-center rounded-xl" style={{ backgroundColor: BRAND_BLUE, opacity: disabled || processing ? 0.55 : 1 }}>{processing ? <ActivityIndicator color="#fff" /> : <Ionicons name="card-outline" size={18} color="#fff" />}<AppText className="ml-2 font-bold text-white">{processing ? 'Tasdiqlanmoqda...' : "To'lash"}</AppText></Pressable></View></View></Modal>;
}
