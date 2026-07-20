import { useEffect, useId, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { AppText } from './app-text';
import { BRAND_BLUE } from '../constants/theme';

const STRIPE_JS_SRC = 'https://js.stripe.com/v3/';
const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

type StripeElement = {
  mount: (target: string | HTMLElement) => void;
  destroy: () => void;
  on: (event: 'change' | 'ready', handler: (event?: { error?: { message?: string } }) => void) => void;
};

type StripeElements = {
  create: (
    type: 'cardNumber' | 'cardExpiry' | 'cardCvc',
    options?: {
      disableLink?: boolean;
      showIcon?: boolean;
      placeholder?: string;
      style?: Record<string, unknown>;
    }
  ) => StripeElement;
};

type StripeJs = {
  elements: () => StripeElements;
  confirmCardPayment: (
    clientSecret: string,
    options: { payment_method: { card: StripeElement } }
  ) => Promise<{ error?: { message?: string }; paymentIntent?: { status?: string } }>;
};

declare global {
  interface Window {
    Stripe?: (key: string) => StripeJs | null;
  }
}

let stripeScriptPromise: Promise<void> | null = null;

function loadStripeScript() {
  if (typeof document === 'undefined') return Promise.reject(new Error('Stripe.js requires a browser'));
  if (window.Stripe) return Promise.resolve();
  if (!stripeScriptPromise) {
    stripeScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${STRIPE_JS_SRC}"]`);
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Stripe.js failed to load')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = STRIPE_JS_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Stripe.js failed to load'));
      document.head.appendChild(script);
    });
  }
  return stripeScriptPromise;
}

export function EmbeddedStripeCheckout({
  clientSecret,
  onComplete,
  onCancel,
}: {
  clientSecret: string;
  onComplete: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const reactId = useId().replace(/:/g, '');
  const numberId = `stripe-card-number-${reactId}`;
  const expiryId = `stripe-card-expiry-${reactId}`;
  const cvcId = `stripe-card-cvc-${reactId}`;
  const stripeRef = useRef<StripeJs | null>(null);
  const cardNumberRef = useRef<StripeElement | null>(null);
  const cardExpiryRef = useRef<StripeElement | null>(null);
  const cardCvcRef = useRef<StripeElement | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    setError('');
    setLoading(true);

    async function mountCard() {
      if (!PUBLISHABLE_KEY) {
        setError('EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY sozlanmagan.');
        setLoading(false);
        return;
      }
      try {
        await loadStripeScript();
        if (!alive) return;
        const stripe = window.Stripe?.(PUBLISHABLE_KEY);
        if (!stripe) throw new Error('Stripe card form unavailable');
        const elements = stripe.elements();
        const elementStyle = {
          base: {
            color: '#111827',
            fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
            fontSize: '16px',
            fontSmoothing: 'antialiased',
            '::placeholder': { color: '#9CA3AF' },
          },
          invalid: { color: '#DC2626' },
        };
        const cardNumber = elements.create('cardNumber', {
          disableLink: true,
          showIcon: true,
          placeholder: '4242 4242 4242 4242',
          style: elementStyle,
        });
        const cardExpiry = elements.create('cardExpiry', {
          placeholder: 'MM / YY',
          style: elementStyle,
        });
        const cardCvc = elements.create('cardCvc', {
          placeholder: 'CVC',
          style: elementStyle,
        });
        cardNumber.on('ready', () => alive && setLoading(false));
        cardNumber.on('change', (event) => alive && setError(event?.error?.message ?? ''));
        cardExpiry.on('change', (event) => alive && setError(event?.error?.message ?? ''));
        cardCvc.on('change', (event) => alive && setError(event?.error?.message ?? ''));
        cardNumber.mount(`#${numberId}`);
        cardExpiry.mount(`#${expiryId}`);
        cardCvc.mount(`#${cvcId}`);
        stripeRef.current = stripe;
        cardNumberRef.current = cardNumber;
        cardExpiryRef.current = cardExpiry;
        cardCvcRef.current = cardCvc;
      } catch (e) {
        if (alive) {
          setError(e instanceof Error ? e.message : 'Stripe card form ochilmadi.');
          setLoading(false);
        }
      }
    }

    mountCard();
    return () => {
      alive = false;
      cardNumberRef.current?.destroy();
      cardExpiryRef.current?.destroy();
      cardCvcRef.current?.destroy();
      cardNumberRef.current = null;
      cardExpiryRef.current = null;
      cardCvcRef.current = null;
      stripeRef.current = null;
    };
  }, [clientSecret, cvcId, expiryId, numberId]);

  const submit = async () => {
    if (submitting || !stripeRef.current || !cardNumberRef.current) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await stripeRef.current.confirmCardPayment(clientSecret, {
        payment_method: { card: cardNumberRef.current },
      });
      if (result.error) {
        setError(result.error.message ?? 'Karta orqali tolov otmadi.');
        return;
      }
      if (result.paymentIntent?.status === 'succeeded') await onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tolovni yakunlab bolmadi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <AppText className="mb-2 font-semibold text-base text-foreground">Karta ma'lumotlari</AppText>
      <View className="overflow-hidden rounded-xl border border-border bg-white">
        <View className="h-14 justify-center px-4">
          <div id={numberId} />
        </View>
        <View className="h-px bg-border" />
        <View className="flex-row">
          <View className="h-14 flex-1 justify-center px-4">
            <div id={expiryId} />
          </View>
          <View className="w-px bg-border" />
          <View className="h-14 flex-1 justify-center px-4">
            <div id={cvcId} />
          </View>
        </View>
      </View>
      {loading ? (
        <View className="mt-3 flex-row items-center">
          <ActivityIndicator color={BRAND_BLUE} />
          <AppText className="ml-2 text-sm text-muted">Karta formasi yuklanmoqda...</AppText>
        </View>
      ) : null}
      {error ? <AppText className="mt-3 text-sm text-red-500">{error}</AppText> : null}
      <View className="mt-4 flex-row gap-3">
        <Pressable
          onPress={onCancel}
          disabled={submitting}
          className="h-12 flex-1 items-center justify-center rounded-xl border border-border active:opacity-70"
        >
          <AppText className="font-semibold text-sm text-foreground">Orqaga</AppText>
        </Pressable>
        <Pressable
          onPress={submit}
          disabled={loading || submitting}
          className="h-12 flex-[1.4] items-center justify-center rounded-xl active:opacity-80"
          style={{ backgroundColor: BRAND_BLUE, opacity: loading || submitting ? 0.55 : 1 }}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <AppText className="font-bold text-sm text-white">Tolovni otkazish</AppText>
          )}
        </Pressable>
      </View>
    </View>
  );
}
