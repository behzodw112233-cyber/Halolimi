import { Ionicons } from '@expo/vector-icons';
import { api } from '@halolmia/backend/convex/_generated/api';
import { CardField, useConfirmPayment } from '@stripe/stripe-react-native';
import { useAction } from 'convex/react';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, View } from 'react-native';
import { AppText } from './app-text';
import { BRAND_BLUE } from '../constants/theme';

export function StripeCardSheet({ visible, title, amount, clientSecret, onClose, onPaid }: {
  visible: boolean; title: string; amount: string; clientSecret: string | null; onClose: () => void; onPaid: () => void;
}) {
  const confirmStripePayment = useAction(api.jamgarma.confirmStripePayment);
  const { confirmPayment } = useConfirmPayment();
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const pay = async () => {
    if (!clientSecret || processing) return;
    setProcessing(true); setError(null);
    try {
      const result = await confirmPayment(clientSecret, { paymentMethodType: 'Card' });
      if (result.error) throw new Error(result.error.message);
      const paymentIntentId = result.paymentIntent?.id ?? clientSecret.split('_secret_')[0];
      const settlement = await confirmStripePayment({ paymentIntentId });
      if (!settlement.ok) throw new Error(settlement.error);
      onPaid();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "To'lov o'tmadi."); }
    finally { setProcessing(false); }
  };
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View className="flex-1 items-center justify-center bg-black/40 px-5"><View className="w-full max-w-[390px] rounded-2xl bg-white p-5"><View className="mb-4 flex-row items-start justify-between"><View className="flex-1 pr-3"><AppText className="font-bold text-lg text-[#0F172A]">{title}</AppText><AppText className="mt-1 text-sm text-[#64748B]">{amount}</AppText></View><Pressable onPress={onClose} hitSlop={10} className="h-8 w-8 items-center justify-center rounded-full bg-[#F1F5F9]"><Ionicons name="close" size={18} color="#64748B" /></Pressable></View><View className="h-13 justify-center rounded-xl border border-[#CBD5E1] bg-white px-3"><CardField postalCodeEnabled={false} placeholders={{ number: 'Karta raqami' }} cardStyle={{ backgroundColor: '#FFFFFF', textColor: '#0F172A', placeholderColor: '#94A3B8' }} style={{ width: '100%', height: 48 }} onCardChange={(details) => { setComplete(details.complete); if (details.complete) setError(null); }} /></View>{error ? <AppText className="mt-2 text-sm text-[#DC2626]">{error}</AppText> : null}<Pressable onPress={() => void pay()} disabled={!complete || processing || !clientSecret} className="mt-4 h-12 flex-row items-center justify-center rounded-xl" style={{ backgroundColor: BRAND_BLUE, opacity: !complete || processing || !clientSecret ? 0.55 : 1 }}>{processing ? <ActivityIndicator color="#fff" /> : <Ionicons name="card-outline" size={18} color="#fff" />}<AppText className="ml-2 font-bold text-white">{processing ? 'Tasdiqlanmoqda...' : "To'lash"}</AppText></Pressable></View></View></Modal>;
}
