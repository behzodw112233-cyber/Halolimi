import { Ionicons } from '@expo/vector-icons';
import { api } from '@halolmia/backend/convex/_generated/api';
import type { Doc, Id } from '@halolmia/backend/convex/_generated/dataModel';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/app-text';
import { BRAND_BLUE } from '../constants/theme';
import { useAuth } from '../lib/auth';
import { StripeCardSheet } from '../components/stripe-card-sheet';

const ANIMALS = [
  { id: 'sheep', emoji: '🐑', label: "Qo'y" },
  { id: 'cow', emoji: '🐄', label: 'Sigir' },
  { id: 'goat', emoji: '🐐', label: 'Echki' },
  { id: 'chicken', emoji: '🐓', label: 'Tovuq' },
  { id: 'qurbonlik', emoji: '🎁', label: 'Qurbonlik' },
];

const MIN_WALLET_AMOUNT = 1_000;
const MIN_STRIPE_AMOUNT = 10_000;
const PRESETS = [10_000, 50_000, 100_000, 500_000];

const fmtSom = (n: number) => `${Math.round(n).toLocaleString('ru-RU')} so'm`;

type SavingsGoal = Doc<'savingsGoals'>;

export default function JamgarmaScreen() {
  const router = useRouter();
  const { userId, user } = useAuth();
  const goals = useQuery(api.jamgarma.list, userId ? { userId } : 'skip');
  const createGoal = useMutation(api.jamgarma.createGoal);
  const depositFromWallet = useMutation(api.jamgarma.depositFromWallet);
  const createStripeCheckout = useAction(api.jamgarma.createStripeCheckout);

  const [createOpen, setCreateOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [animalType, setAnimalType] = useState('sheep');
  const [targetAmount, setTargetAmount] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [selectedGoalId, setSelectedGoalId] = useState<Id<'savingsGoals'> | null>(null);
  const [busy, setBusy] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [cardClientSecret, setCardClientSecret] = useState<string | null>(null);

  const selectedGoal = goals?.find((goal: SavingsGoal) => goal._id === selectedGoalId);
  const totalSaved = goals?.reduce((sum: number, goal: SavingsGoal) => sum + goal.savedAmount, 0) ?? 0;
  const selectedRemaining = selectedGoal
    ? Math.max(0, selectedGoal.targetAmount - selectedGoal.savedAmount)
    : 0;
  const parsedDepositAmount = Number(depositAmount);
  const stripeAmountReady =
    Number.isFinite(parsedDepositAmount) && parsedDepositAmount >= MIN_STRIPE_AMOUNT;
  const stripeOverpayAmount =
    selectedGoal && stripeAmountReady
      ? Math.max(0, Math.round(parsedDepositAmount) - selectedRemaining)
      : 0;

  const openDeposit = (goalId: Id<'savingsGoals'>) => {
    setSelectedGoalId(goalId);
    setDepositAmount('');
    setDepositOpen(true);
  };

  const handleCreate = async () => {
    if (!userId) return router.push('/login');
    const amount = Number(targetAmount);
    if (!Number.isFinite(amount) || amount < MIN_WALLET_AMOUNT) {
      Alert.alert('Maqsad kiriting', `Kamida ${fmtSom(MIN_WALLET_AMOUNT)} bo'lsin.`);
      return;
    }
    setBusy(true);
    try {
      await createGoal({
        userId,
        animalType,
        title: `${ANIMALS.find((animal) => animal.id === animalType)?.label ?? 'Hayvon'} uchun jamg'arma`,
        targetAmount: amount,
      });
      setCreateOpen(false);
      setTargetAmount('');
    } catch (error) {
      Alert.alert('Xatolik', error instanceof Error ? error.message : 'Maqsad yaratilmadi.');
    } finally {
      setBusy(false);
    }
  };

  const handleWalletDeposit = async () => {
    if (!userId || !selectedGoalId) return;
    const amount = Number(depositAmount);
    if (!Number.isFinite(amount) || amount < MIN_WALLET_AMOUNT) {
      Alert.alert('Summa kiriting', `Kamida ${fmtSom(MIN_WALLET_AMOUNT)} bo'lsin.`);
      return;
    }
    setBusy(true);
    try {
      await depositFromWallet({ userId, goalId: selectedGoalId, amount });
      setDepositOpen(false);
      setDepositAmount('');
      Alert.alert("Zo'r! 🎉", "Pul Jamg'arma maqsadingizga qo'shildi.");
    } catch (error) {
      Alert.alert('Xatolik', error instanceof Error ? error.message : "Pul qo'shilmadi.");
    } finally {
      setBusy(false);
    }
  };

  const handleStripeDeposit = async () => {
    if (!userId || !selectedGoalId) return;
    const amount = Number(depositAmount);
    if (!Number.isFinite(amount) || amount < MIN_STRIPE_AMOUNT) {
      Alert.alert('Summa kiriting', `Stripe orqali kamida ${fmtSom(MIN_STRIPE_AMOUNT)} to'lash mumkin.`);
      return;
    }
    setBusy(true);
    try {
      const checkout = await createStripeCheckout({
        userId,
        goalId: selectedGoalId,
        amount,
      });
      if (!checkout.ok) {
        Alert.alert('Stripe xabari', checkout.error);
        return;
      }
      setDepositOpen(false);
      setCardClientSecret(checkout.clientSecret);
      setCardOpen(true);
    } catch (error) {
      Alert.alert('Stripe xatoligi', error instanceof Error ? error.message : "To'lov ochilmadi.");
    } finally {
      setBusy(false);
    }
  };

  if (!userId) {
    return (
      <View className="flex-1 bg-[#F4F5F7]">
        <SafeAreaView className="flex-1 items-center justify-center px-5">
          <AppText className="mb-2 text-center font-bold text-2xl text-[#0F172A]">Jamg'arma 🐑</AppText>
          <AppText className="mb-6 text-center text-base leading-6 text-[#64748B]">
            Hayvon uchun oz-ozdan pul yig'ing.
          </AppText>
          <Pressable onPress={() => router.push('/login')} className="rounded-2xl px-8 py-4" style={{ backgroundColor: BRAND_BLUE }}>
            <AppText className="font-bold text-white">Kirish</AppText>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F4F5F7]">
      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
          <View className="flex-row items-center justify-between px-5 pb-3 pt-3">
            <View>
              <AppText className="text-sm font-semibold text-[#64748B]">Halolmi</AppText>
              <AppText className="font-bold text-3xl text-[#0F172A]">Jamg'arma 🐾</AppText>
            </View>
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Ionicons name="close" size={26} color="#64748B" />
            </Pressable>
          </View>

          <View className="mx-4 overflow-hidden rounded-[28px] p-5" style={{ backgroundColor: '#0A6CFF' }}>
            <View className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
            <AppText className="text-sm font-semibold text-white/75">Jami yig'ilgan</AppText>
            <AppText className="mt-1 font-bold text-4xl text-white">{fmtSom(totalSaved)}</AppText>
            <AppText className="mt-2 text-sm leading-5 text-white/80">
              Maqsad tanlang - pul qo'shing - hayvoningizga yaqinlashing 🚀
            </AppText>
          </View>

          <View className="mt-5 flex-row items-center justify-between px-5">
            <AppText className="font-bold text-xl text-[#0F172A]">Maqsadlarim</AppText>
            <Pressable onPress={() => setCreateOpen(true)} className="flex-row items-center rounded-xl px-3 py-2" style={{ backgroundColor: '#DCE9FF' }}>
              <Ionicons name="add" size={18} color={BRAND_BLUE} />
              <AppText className="ml-1 font-bold" style={{ color: BRAND_BLUE }}>Yangi</AppText>
            </Pressable>
          </View>

          {goals === undefined ? (
            <ActivityIndicator color={BRAND_BLUE} style={{ marginTop: 32 }} />
          ) : goals.length === 0 ? (
            <View className="mx-4 mt-4 items-center rounded-3xl bg-white p-7">
              <AppText className="mb-2 text-5xl">🐑</AppText>
              <AppText className="text-center font-bold text-lg text-[#0F172A]">Birinchi maqsadni yarating</AppText>
              <AppText className="mt-2 text-center leading-5 text-[#64748B]">
                Masalan: "Qo'y olish uchun 5 000 000 so'm".
              </AppText>
              <Pressable onPress={() => setCreateOpen(true)} className="mt-5 rounded-2xl px-6 py-4" style={{ backgroundColor: BRAND_BLUE }}>
                <AppText className="font-bold text-white">Maqsad yaratish</AppText>
              </Pressable>
            </View>
          ) : (
            <View className="mt-4">
              {goals.map((goal: SavingsGoal) => {
                const progress = Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100));
                return (
                  <View key={goal._id} className="mx-4 mb-3 rounded-3xl bg-white p-4">
                    <View className="flex-row items-center">
                      <View className="h-14 w-14 items-center justify-center rounded-2xl bg-[#EFF6FF]">
                        <AppText className="text-3xl">{goal.emoji}</AppText>
                      </View>
                      <View className="ml-3 flex-1">
                        <AppText className="font-bold text-lg text-[#0F172A]">{goal.title}</AppText>
                        <AppText className="mt-1 text-sm text-[#64748B]">{fmtSom(goal.savedAmount)} / {fmtSom(goal.targetAmount)}</AppText>
                      </View>
                      <AppText className="font-bold" style={{ color: progress >= 100 ? '#16A34A' : BRAND_BLUE }}>{progress}%</AppText>
                    </View>
                    <View className="mt-4 h-3 overflow-hidden rounded-full bg-[#E2E8F0]">
                      <View className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: progress >= 100 ? '#22C55E' : BRAND_BLUE }} />
                    </View>
                    {goal.status === 'completed' ? (
                      <View className="mt-3 flex-row items-center rounded-xl bg-[#DCFCE7] px-3 py-2">
                        <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                        <AppText className="ml-2 font-semibold text-[#166534]">Maqsad tayyor! 🎉</AppText>
                      </View>
                    ) : (
                      <Pressable onPress={() => openDeposit(goal._id)} className="mt-3 flex-row items-center justify-center rounded-2xl py-3" style={{ backgroundColor: '#EAF2FF' }}>
                        <Ionicons name="add-circle-outline" size={19} color={BRAND_BLUE} />
                        <AppText className="ml-2 font-bold" style={{ color: BRAND_BLUE }}>Pul qo'shish</AppText>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          <AppText className="mx-5 mt-3 text-center text-xs leading-5 text-[#94A3B8]">
            Hozirgi versiya - hayvon sotib olish uchun jamg'arma. Investitsiya foydasi va daromad va'dasi yo'q.
          </AppText>
        </ScrollView>

        <StripeCardSheet
          visible={cardOpen}
          title={selectedGoal ? `Jamg'arma: ${selectedGoal.title}` : "Jamg'arma"}
          amount={fmtSom(parsedDepositAmount || 0)}
          clientSecret={cardClientSecret}
          onClose={() => { setCardOpen(false); setCardClientSecret(null); }}
          onPaid={() => {
            setCardOpen(false);
            setCardClientSecret(null);
            setDepositAmount('');
            Alert.alert("To'lov qabul qilindi", "Jamg'arma yangilandi.");
          }}
        />

        <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}>
          <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable className="flex-1 bg-black/40" onPress={() => setCreateOpen(false)} />
          <View className="rounded-t-3xl bg-white px-5 pb-8 pt-5">
            <AppText className="font-bold text-2xl text-[#0F172A]">Nima uchun yig'amiz?</AppText>
            <AppText className="mt-1 text-[#64748B]">Hayvonni tanlang 🐾</AppText>
            <View className="mt-4 flex-row flex-wrap gap-2">
              {ANIMALS.map((animal) => (
                <Pressable key={animal.id} onPress={() => setAnimalType(animal.id)} className="w-[31%] items-center rounded-2xl p-3" style={{ backgroundColor: animalType === animal.id ? '#DCE9FF' : '#F1F5F9' }}>
                  <AppText className="text-3xl">{animal.emoji}</AppText>
                  <AppText className="mt-1 text-xs font-bold text-[#334155]">{animal.label}</AppText>
                </Pressable>
              ))}
            </View>
            <TextInput value={targetAmount} onChangeText={(value) => setTargetAmount(value.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="Maqsad summa, masalan 5000000" placeholderTextColor="#94A3B8" className="mt-4 h-14 rounded-2xl border px-4 text-base text-[#0F172A]" style={{ borderColor: '#CBD5E1' }} />
            <Pressable onPress={handleCreate} disabled={busy} className="mt-4 items-center rounded-2xl py-4" style={{ backgroundColor: BRAND_BLUE, opacity: busy ? 0.6 : 1 }}>
              {busy ? <ActivityIndicator color="#fff" /> : <AppText className="font-bold text-white">Saqlashni boshlash 🚀</AppText>}
            </Pressable>
          </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal visible={depositOpen} transparent animationType="slide" onRequestClose={() => setDepositOpen(false)}>
          <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable className="flex-1 bg-black/40" onPress={() => setDepositOpen(false)} />
          <View className="rounded-t-3xl bg-white px-5 pb-8 pt-5">
            <AppText className="font-bold text-2xl text-[#0F172A]">Pul qo'shamiz 💸</AppText>
            <AppText className="mt-1 text-[#64748B]">{selectedGoal?.title ?? "Jamg'arma"}</AppText>
            {selectedGoal ? (
              <AppText className="mt-1 text-xs text-[#94A3B8]">
                Qolgan summa: {fmtSom(selectedRemaining)}
              </AppText>
            ) : null}
            <View className="mt-4 flex-row flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <Pressable key={preset} onPress={() => setDepositAmount(String(preset))} className="rounded-xl px-3 py-2" style={{ backgroundColor: depositAmount === String(preset) ? BRAND_BLUE : '#F1F5F9' }}>
                  <AppText className="font-semibold" style={{ color: depositAmount === String(preset) ? '#fff' : '#334155' }}>{fmtSom(preset)}</AppText>
                </Pressable>
              ))}
            </View>
            <TextInput value={depositAmount} onChangeText={(value) => setDepositAmount(value.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="Boshqa summa" placeholderTextColor="#94A3B8" className="mt-4 h-14 rounded-2xl border px-4 text-base text-[#0F172A]" style={{ borderColor: '#CBD5E1' }} />
            {selectedGoal && selectedRemaining < MIN_STRIPE_AMOUNT ? (
              <AppText className="mt-3 rounded-2xl bg-[#F8FAFC] px-3 py-2 text-center text-xs text-[#64748B]">
                Stripe minimumi {fmtSom(MIN_STRIPE_AMOUNT)}. Keragidan ortiq to'lov Halolmi balansingizga tushadi.
              </AppText>
            ) : null}
            {stripeOverpayAmount > 0 ? (
              <AppText className="mt-2 text-center text-xs text-[#64748B]">
                Ortib qoladigan {fmtSom(stripeOverpayAmount)} balansga qo'shiladi.
              </AppText>
            ) : null}
            <Pressable onPress={handleStripeDeposit} disabled={busy} className="mt-4 flex-row items-center justify-center rounded-2xl py-4" style={{ backgroundColor: '#635BFF', opacity: busy ? 0.6 : 1 }}>
              {busy ? <ActivityIndicator color="#fff" /> : <><Ionicons name="card-outline" size={19} color="#fff" /><AppText className="ml-2 font-bold text-white">Stripe orqali to'lash</AppText></>}
            </Pressable>
            <Pressable onPress={handleWalletDeposit} disabled={busy} className="mt-2 items-center rounded-2xl py-3">
              <AppText className="font-semibold" style={{ color: BRAND_BLUE }}>Halolmi hisobidan ({fmtSom(user?.balance ?? 0)})</AppText>
            </Pressable>
          </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </View>
  );
}
