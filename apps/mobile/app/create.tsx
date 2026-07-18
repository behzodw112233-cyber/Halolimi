import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { api } from '@halolmia/backend/convex/_generated/api';
import type { Id } from '@halolmia/backend/convex/_generated/dataModel';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/app-text';
import { BREEDS, CATEGORY_LABELS } from '../constants/breeds';
import {
  districtsOf,
  nearestRegion,
  REGION_NAMES,
  regionCentroid,
} from '../constants/regions';
import { BRAND_BLUE } from '../constants/theme';
import { useAuth } from '../lib/auth';
import { useMyLocation } from '../lib/location';
import { uploadToConvex } from '../lib/upload';

const STEP_COUNT = 8;

const SALE_TYPES = [
  { id: 'naqt', label: 'Naqt', icon: 'wallet-outline' as const },
  { id: 'almashuv', label: 'Almashuv', icon: 'swap-horizontal-outline' as const },
  { id: 'bulib', label: "Boʻlib toʻlash", icon: 'documents-outline' as const },
];

const INFO_TAGS = [
  'Sogʻin', 'Naslli', 'Vaksina qilingan', 'Bugʻoz', 'Yosh', 'Semiz',
  'Hujjatlari bor', 'Suti koʻp', 'Qurbonlik uchun', 'Kasal emas',
  'Emizikli', 'Yarim yosh',
];

const PRICE_SUGGESTIONS = ['5 000 000', '8 000 000', '12 000 000', '15 000 000'];

const tap = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
};

export default function Create() {
  const router = useRouter();
  const { category = 'cattle' } = useLocalSearchParams<{ category?: string }>();
  const { userId, user, login } = useAuth();

  const [step, setStep] = useState(0);
  const [breed, setBreed] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [weight, setWeight] = useState('');
  const [desc, setDesc] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [saleTypes, setSaleTypes] = useState<string[]>(['naqt']);
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<'usd' | 'uzs'>('usd');
  // Location: viloyat → tuman picker, or one-tap GPS.
  const [region, setRegion] = useState<string | null>(null);
  const [district, setDistrict] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locBusy, setLocBusy] = useState(false);
  const myLocation = useMyLocation();
  const [phone, setPhone] = useState('+998 ');
  const [phoneError, setPhoneError] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);

  // Categories (with admin-editable breeds) come from the backend; fall back to
  // the bundled defaults until the query resolves or if a slug is missing.
  const cats = useQuery(api.categories.list) ?? [];
  const catDoc = cats.find((c) => c.slug === category);
  const catLabel = catDoc?.name ?? CATEGORY_LABELS[category] ?? 'Hayvon';
  const breeds = useMemo(
    () => (catDoc?.breeds?.length ? catDoc.breeds : BREEDS[category] ?? []),
    [catDoc, category]
  );
  const filteredBreeds = useMemo(
    () => breeds.filter((b) => b.toLowerCase().includes(query.toLowerCase())),
    [breeds, query]
  );
  // GPS one-tap: detect coordinates, auto-pick the nearest viloyat, then let the
  // seller confirm their tuman. Simple enough for a shepherd — one button.
  const detectLocation = async () => {
    tap();
    setLocBusy(true);
    try {
      const c = await myLocation.request();
      if (c) {
        setCoords(c);
        setRegion(nearestRegion(c).name);
        setDistrict(null);
      }
    } finally {
      setLocBusy(false);
    }
  };

  // Manual pick: choosing a viloyat uses its centroid for distance until (and
  // unless) the seller uses GPS.
  const chooseRegion = (name: string) => {
    tap();
    setRegion(name);
    setDistrict(null);
    if (!coords) setCoords(regionCentroid(name));
  };

  // Finish the location step. District is optional ("butun viloyat boʻylab").
  const confirmLocation = (tuman: string | null) => {
    tap();
    setDistrict(tuman);
    setStep(7);
  };

  const locationLabel = district ? `${region} · ${district}` : region;

  const close = () => {
    tap();
    router.replace('/home');
  };
  const back = () => {
    tap();
    if (step === 0) router.back();
    else setStep((s) => s - 1);
  };
  const next = () => {
    tap();
    if (step < STEP_COUNT - 1) setStep((s) => s + 1);
  };

  const toggle = (arr: string[], set: (v: string[]) => void, id: string) =>
    set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  const pickImages = async () => {
    tap();
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!res.canceled) {
      setPhotos((p) => [...p, ...res.assets.map((a) => a.uri)]);
    }
  };

  const submitPhone = () => {
    tap();
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 12) {
      setPhoneError(true);
      return;
    }
    setPhoneError(false);
    setOtpOpen(true);
  };

  const createListing = useMutation(api.listings.create);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  // Upload each locally-picked photo to Convex storage, returning its storage id.
  const uploadPhotos = async (): Promise<Id<'_storage'>[]> => {
    const ids: Id<'_storage'>[] = [];
    for (const uri of photos) {
      const uploadUrl = await generateUploadUrl();
      const storageId = await uploadToConvex(uploadUrl, uri);
      if (storageId) ids.push(storageId as Id<'_storage'>);
    }
    return ids;
  };

  const publish = async () => {
    setOtpOpen(false);
    let newId: string | undefined;
    try {
      // Establish (or repair) the session from the phone entered in this flow so
      // the listing is owned by the user and shows up in their profile afterwards.
      let ownerId = userId;
      if (!ownerId) {
        const digits = phone.replace(/\D/g, '');
        if (digits.length >= 9) {
          try {
            ownerId = await login('+998' + digits.slice(-9), user?.name);
          } catch {
            /* login failed — publish anonymously */
          }
        }
      }
      const photoIds = await uploadPhotos();
      newId = await createListing({
        title: `${catLabel}${breed ? ' · ' + breed : ''}`,
        price: `${price || '0'} ${currency === 'usd' ? 'y.e.' : 'soʻm'}`,
        category,
        // `city` stays the human label shown on cards; region/district/coords
        // power filtering and real "nearby" distance.
        city: district || region || 'Oʻzbekiston',
        region: region || undefined,
        district: district || undefined,
        lat: coords?.lat,
        lng: coords?.lng,
        phone: phone.trim(),
        specs: [
          { label: 'Vazni', value: `${weight || '—'} kg` },
          ...(breed ? [{ label: 'Zot', value: breed }] : []),
        ],
        desc,
        sellerName: user?.name ?? 'Sotuvchi',
        ownerId: ownerId ?? undefined,
        photos: photoIds.length ? photoIds : undefined,
      });
    } catch {
      /* demo: ignore write errors */
    }
    // Carry the new listing id so the promote screen can boost it.
    router.replace(newId ? { pathname: '/promote', params: { listingId: newId } } : '/promote');
  };

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        {/* Header */}
        <View className="h-12 flex-row items-center justify-between px-4">
          <Pressable onPress={back} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
            <Ionicons name="arrow-back" size={24} color={BRAND_BLUE} />
          </Pressable>
          <Pressable onPress={close} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
            <AppText className="font-medium text-base" style={{ color: BRAND_BLUE }}>Yopish</AppText>
          </Pressable>
        </View>

        {/* Progress */}
        <View className="mx-4 mb-2 h-1.5 overflow-hidden rounded-full bg-surface-secondary">
          <View className="h-full rounded-full" style={{ width: `${((step + 1) / STEP_COUNT) * 100}%`, backgroundColor: BRAND_BLUE }} />
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: 12 }}>
          {/* 0 — Breed */}
          {step === 0 && (
            <View>
              <StepTitle>{catLabel}</StepTitle>
              <SearchBox value={query} onChange={setQuery} placeholder="Zot boʻyicha qidirish" />
              <AppText className="mb-2 font-bold text-lg text-foreground">Mashhur zotlar</AppText>
              {filteredBreeds.map((b) => (
                <RowLink key={b} label={b} onPress={() => { setBreed(b); tap(); setStep(1); }} />
              ))}
            </View>
          )}

          {/* 1 — Weight */}
          {step === 1 && (
            <View>
              <StepTitle>Vazn, kg</StepTitle>
              <TextInput
                value={weight}
                onChangeText={(t) => setWeight(t.replace(/[^0-9]/g, ''))}
                placeholder="0 kg" placeholderTextColor="#9ca3af" keyboardType="number-pad"
                className="mb-5 h-14 rounded-xl border px-4 text-lg text-foreground"
                style={{ borderColor: BRAND_BLUE, fontFamily: 'Inter-Regular' }}
              />
              <PrimaryButton label="Davom etish" disabled={!weight} onPress={next} />
            </View>
          )}

          {/* 2 — Info */}
          {step === 2 && (
            <View>
              <StepTitle>Maʼlumot</StepTitle>
              <TextInput
                value={desc} onChangeText={setDesc} multiline
                placeholder="Maʼlumot qanchalik batafsil boʻlsa, shuncha koʻp qoʻngʻiroqlar olishingiz mumkin"
                placeholderTextColor="#9ca3af"
                className="mb-4 rounded-xl border border-border p-4 text-base text-foreground"
                style={{ minHeight: 110, textAlignVertical: 'top', fontFamily: 'Inter-Regular' }}
              />
              <View className="mb-6 flex-row flex-wrap gap-2">
                {INFO_TAGS.map((t) => {
                  const active = tags.includes(t);
                  return (
                    <Pressable key={t} onPress={() => { tap(); toggle(tags, setTags, t); }}
                      className="rounded-full px-4 py-2.5"
                      style={{ backgroundColor: active ? BRAND_BLUE : '#F1F3F5' }}>
                      <AppText className="text-[15px]" style={{ color: active ? '#fff' : '#374151' }}>{t}</AppText>
                    </Pressable>
                  );
                })}
              </View>
              <PrimaryButton label="Davom etish" onPress={next} />
            </View>
          )}

          {/* 3 — Photos */}
          {step === 3 && (
            <View>
              <StepTitle>Rasmlar</StepTitle>
              {photos.length > 0 && (
                <View className="mb-3 flex-row flex-wrap gap-2">
                  {photos.map((uri) => (
                    <View key={uri} className="overflow-hidden rounded-xl" style={{ width: '31.5%', aspectRatio: 1 }}>
                      <Image source={{ uri }} contentFit="cover" style={{ width: '100%', height: '100%' }} />
                      <Pressable onPress={() => setPhotos((p) => p.filter((x) => x !== uri))}
                        className="absolute right-1 top-1 h-6 w-6 items-center justify-center rounded-full bg-black/60">
                        <Ionicons name="close" size={14} color="white" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
              <Pressable onPress={pickImages}
                className="mb-4 items-center justify-center rounded-2xl border-2 border-dashed py-10"
                style={{ borderColor: BRAND_BLUE }}>
                <View className="mb-2 h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: BRAND_BLUE }}>
                  <Ionicons name="add" size={28} color="white" />
                </View>
                <AppText className="font-medium text-base" style={{ color: BRAND_BLUE }}>Rasmni qoʻshish</AppText>
              </Pressable>
              {photos.length > 0 ? (
                <PrimaryButton label="Davom etish" onPress={next} />
              ) : (
                <Pressable onPress={next} className="h-14 items-center justify-center rounded-xl active:opacity-80" style={{ backgroundColor: BRAND_BLUE + '1A' }}>
                  <AppText className="font-medium text-base" style={{ color: BRAND_BLUE }}>Rasmsiz davom ettirish</AppText>
                </Pressable>
              )}
            </View>
          )}

          {/* 4 — Sale type */}
          {step === 4 && (
            <View>
              <StepTitle>Sotish turi</StepTitle>
              {SALE_TYPES.map((s) => {
                const active = saleTypes.includes(s.id);
                return (
                  <Pressable key={s.id} onPress={() => { tap(); toggle(saleTypes, setSaleTypes, s.id); }}
                    className="flex-row items-center border-b border-border py-4 active:opacity-70">
                    <Ionicons name={s.icon} size={22} color="#374151" />
                    <AppText className="ml-3 flex-1 text-lg text-foreground">{s.label}</AppText>
                    <Check active={active} />
                  </Pressable>
                );
              })}
              <View className="mt-6">
                <PrimaryButton label="Davom etish" disabled={saleTypes.length === 0} onPress={next} />
              </View>
            </View>
          )}

          {/* 5 — Price */}
          {step === 5 && (
            <View>
              <StepTitle>Narx</StepTitle>
              <AppText className="mb-5 text-base text-muted">
                Oʻrtacha narx — <AppText className="font-semibold" style={{ color: BRAND_BLUE }}>12 000 000 soʻm</AppText>
              </AppText>
              <View className="mb-4 flex-row">
                <TextInput value={price} onChangeText={(t) => setPrice(t.replace(/[^0-9]/g, ''))}
                  placeholder={currency === 'usd' ? '$' : 'soʻm'} placeholderTextColor="#9ca3af" keyboardType="number-pad"
                  className="mr-3 h-14 flex-1 rounded-xl border px-4 text-lg text-foreground"
                  style={{ borderColor: BRAND_BLUE, fontFamily: 'Inter-Regular' }} />
                <View className="flex-row overflow-hidden rounded-xl bg-surface-secondary">
                  {(['usd', 'uzs'] as const).map((c) => {
                    const active = currency === c;
                    return (
                      <Pressable key={c} onPress={() => { tap(); setCurrency(c); }} className="items-center justify-center px-4"
                        style={{ backgroundColor: active ? '#fff' : 'transparent' }}>
                        <AppText className="text-base" style={{ color: active ? BRAND_BLUE : '#6b7280', fontFamily: 'Inter-SemiBold' }}>
                          {c === 'usd' ? '$' : 'soʻm'}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }} className="mb-6">
                {PRICE_SUGGESTIONS.map((p) => (
                  <Pressable key={p} onPress={() => { tap(); setPrice(p.replace(/\s/g, '')); }}
                    className="rounded-lg bg-surface-secondary px-4 py-2.5 active:opacity-70">
                    <AppText className="text-base text-foreground">{p} soʻm</AppText>
                  </Pressable>
                ))}
              </ScrollView>
              <PrimaryButton label="Davom etish" disabled={!price} onPress={next} />
            </View>
          )}

          {/* 6 — Location: viloyat → tuman, or one-tap GPS */}
          {step === 6 && (
            <View>
              <StepTitle>Manzil</StepTitle>

              {/* One-tap GPS — the simplest path */}
              <Pressable
                onPress={detectLocation}
                disabled={locBusy}
                className="mb-4 flex-row items-center rounded-2xl px-4 py-4 active:opacity-90"
                style={{ backgroundColor: BRAND_BLUE }}
              >
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <Ionicons name="locate" size={22} color="#fff" />
                </View>
                <View className="flex-1">
                  <AppText className="font-semibold text-base text-white">
                    {locBusy ? 'Aniqlanmoqda…' : 'Joylashuvni aniqlash'}
                  </AppText>
                  <AppText className="text-[13px] text-white/80">
                    Telefoningiz orqali avtomatik topamiz
                  </AppText>
                </View>
              </Pressable>

              {myLocation.denied && (
                <AppText className="mb-3 text-sm" style={{ color: '#EF4444' }}>
                  Joylashuvga ruxsat berilmadi. Pastdan viloyatni tanlang.
                </AppText>
              )}

              {!region ? (
                <>
                  <AppText className="mb-2 font-bold text-lg text-foreground">
                    yoki viloyatni tanlang
                  </AppText>
                  {REGION_NAMES.map((r) => (
                    <RowLink key={r} label={r} onPress={() => chooseRegion(r)} />
                  ))}
                </>
              ) : (
                <>
                  <View className="mb-3 flex-row items-center justify-between rounded-2xl bg-surface p-4">
                    <View className="flex-1 flex-row items-center">
                      <Ionicons name="location" size={20} color={BRAND_BLUE} />
                      <AppText className="ml-2 flex-1 font-semibold text-base text-foreground" numberOfLines={1}>
                        {locationLabel}
                      </AppText>
                    </View>
                    <Pressable onPress={() => { tap(); setRegion(null); setDistrict(null); }} hitSlop={8}>
                      <AppText className="font-semibold text-sm" style={{ color: BRAND_BLUE }}>
                        Oʻzgartirish
                      </AppText>
                    </Pressable>
                  </View>

                  <AppText className="mb-2 font-bold text-lg text-foreground">Tumaningizni tanlang</AppText>
                  <RowLink label={`Butun ${region} boʻylab`} onPress={() => confirmLocation(null)} />
                  {districtsOf(region).map((d) => (
                    <RowLink key={d} label={d} onPress={() => confirmLocation(d)} />
                  ))}
                </>
              )}
            </View>
          )}

          {/* 7 — Phone */}
          {step === 7 && (
            <View>
              <StepTitle>Telefon</StepTitle>
              <TextInput
                value={phone}
                onChangeText={(t) => { setPhone(t); setPhoneError(false); }}
                keyboardType="phone-pad"
                className="h-14 rounded-xl border px-4 text-lg text-foreground"
                style={{ borderColor: phoneError ? '#EF4444' : BRAND_BLUE, fontFamily: 'Inter-Regular' }}
              />
              {phoneError ? (
                <AppText className="mb-4 mt-1.5 text-sm" style={{ color: '#EF4444' }}>Telefon notoʻgʻri kiritilgan</AppText>
              ) : (
                <AppText className="mb-4 mt-1.5 text-sm text-muted">Ushbu raqamga tasdiqlash kodi bilan SMS keladi</AppText>
              )}
              <PrimaryButton label="Davom etish" onPress={submitPhone} />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      <OtpSheet open={otpOpen} phone={phone} onClose={() => setOtpOpen(false)} onVerified={publish} />
    </View>
  );
}

/* ---------- reusable bits ---------- */

function StepTitle({ children }: { children: React.ReactNode }) {
  return <AppText className="mb-5 font-display text-4xl text-foreground">{children}</AppText>;
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <View className="mb-6 h-12 flex-row items-center rounded-xl bg-surface-secondary px-4">
      <Ionicons name="search" size={20} color="#9ca3af" />
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#9ca3af"
        className="ml-3 flex-1 text-base text-foreground" style={{ fontFamily: 'Inter-Regular' }} />
    </View>
  );
}

function RowLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center justify-between border-b border-border py-4 active:opacity-60">
      <AppText className="text-lg text-foreground">{label}</AppText>
      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
    </Pressable>
  );
}

function Check({ active }: { active: boolean }) {
  return (
    <View className="h-6 w-6 items-center justify-center rounded-md border"
      style={{ borderColor: active ? BRAND_BLUE : '#d1d5db', backgroundColor: active ? BRAND_BLUE : 'transparent' }}>
      {active && <Ionicons name="checkmark" size={16} color="white" />}
    </View>
  );
}

function PrimaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} className="h-14 items-center justify-center rounded-xl active:opacity-90"
      style={{ backgroundColor: BRAND_BLUE, opacity: disabled ? 0.4 : 1 }}>
      <AppText className="font-semibold text-base text-white">{label}</AppText>
    </Pressable>
  );
}

/* ---------- OTP bottom sheet ---------- */

function OtpSheet({ open, phone, onClose, onVerified }: { open: boolean; phone: string; onClose: () => void; onVerified: () => void }) {
  const [code, setCode] = useState('');
  const [seconds, setSeconds] = useState(55);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [checkedCode, setCheckedCode] = useState('');
  const inputRef = useRef<TextInput>(null);
  const requestOtp = useAction(api.smsOtp.request);
  const verifyOtp = useAction(api.smsOtp.verify);

  useEffect(() => {
    if (!open) {
      const reset = setTimeout(() => {
        setCode('');
        setSeconds(55);
        setError('');
        setDevCode(null);
        setCheckedCode('');
      }, 0);
      return () => clearTimeout(reset);
    }
    setBusy(true);
    requestOtp({ phone, purpose: 'listing' })
      .then((result) => setDevCode(result.devCode ?? null))
      .catch(() => setError("SMS kod yuborilmadi. Qayta urinib ko'ring."))
      .finally(() => setBusy(false));
    const id = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => { clearInterval(id); clearTimeout(t); };
  }, [open, phone, requestOtp]);

  useEffect(() => {
    if (code.length === 6 && code !== checkedCode && !busy) {
      setBusy(true);
      setError('');
      setCheckedCode(code);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const t = setTimeout(() => {
        verifyOtp({ phone, code, purpose: 'listing' })
          .then((result) => {
            if (result.ok) onVerified();
            else setError("Kod noto'g'ri yoki muddati tugagan.");
          })
          .catch(() => setError("Kodni tekshirib bo'lmadi."))
          .finally(() => setBusy(false));
      }, 200);
      return () => clearTimeout(t);
    }
  }, [busy, checkedCode, code, onVerified, phone, verifyOtp]);

  const resend = () => {
    if (seconds > 0 || busy) return;
    setBusy(true);
    setCode('');
    setCheckedCode('');
    setError('');
    setSeconds(55);
    requestOtp({ phone, purpose: 'listing' })
      .then((result) => setDevCode(result.devCode ?? null))
      .catch(() => setError("SMS kod yuborilmadi. Qayta urinib ko'ring."))
      .finally(() => setBusy(false));
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose} />
      <View className="rounded-t-3xl bg-background px-5 pb-8 pt-5">
        <View className="mb-3 flex-row items-center justify-between">
          <AppText className="font-bold text-xl text-foreground">SMS ichidagi kodni yozing</AppText>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={26} color="#9ca3af" />
          </Pressable>
        </View>
        <AppText className="mb-5 text-base text-muted">
          Kod <AppText className="font-semibold text-foreground">{phone}</AppText> raqamiga yuborildi
        </AppText>

        <Pressable onPress={() => inputRef.current?.focus()} className="mb-4 flex-row gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} className="h-16 flex-1 items-center justify-center rounded-xl border-2"
              style={{ borderColor: code.length === i ? BRAND_BLUE : '#E5E7EB' }}>
              <AppText className="text-2xl font-semibold text-foreground">{code[i] ?? ''}</AppText>
            </View>
          ))}
        </Pressable>

        <TextInput ref={inputRef} value={code} onChangeText={(t) => {
          setError('');
          setCode(t.replace(/[^0-9]/g, '').slice(0, 6));
        }}
          keyboardType="number-pad" maxLength={6} style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }} />

        {devCode ? (
          <AppText className="mb-2 text-base font-semibold" style={{ color: BRAND_BLUE }}>Dev OTP: {devCode}</AppText>
        ) : null}
        {error ? <AppText className="mb-2 text-base text-red-500">{error}</AppText> : null}
        {busy ? <AppText className="mb-2 text-base text-muted">Tekshirilmoqda...</AppText> : null}

        {seconds > 0 ? (
          <AppText className="text-base text-muted">{seconds} dan keyin takroran yuborish</AppText>
        ) : (
          <Pressable onPress={resend}>
            <AppText className="text-base font-medium" style={{ color: BRAND_BLUE }}>Kodni qayta yuborish</AppText>
          </Pressable>
        )}
      </View>
    </Modal>
  );
}
