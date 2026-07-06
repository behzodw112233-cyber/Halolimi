import { api } from '@halolmia/backend/convex/_generated/api';
import type { Id } from '@halolmia/backend/convex/_generated/dataModel';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, ScrollView, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/app-text';
import { CATEGORY_IMAGES } from '../../constants/category-images';
import { BRAND_BLUE } from '../../constants/theme';
import { useAuth } from '../../lib/auth';
import { useSaved } from '../../lib/saved';

const QUICK_MSGS = [
  'Oxirgi narx mi?',
  'Narxni kelishtirasizmi?',
  'Arzonroq qilasizmi?',
  'Qayerda joylashgan?',
];

const REPORT_REASONS = [
  'Aldov yoki firibgarlik',
  'Notoʻgʻri maʼlumot',
  'Nomaqbul kontent',
  'Takroriy eʼlon',
  'Boshqa sabab',
];

export default function ListingDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const listing = useQuery(api.listings.get, { id: id as Id<'listings'> });
  const all = useQuery(api.listings.listActive, {}) ?? [];
  const { isSaved, toggleSave } = useSaved();
  const createReport = useMutation(api.reports.create);
  const [msg, setMsg] = useState('Assalomu alaykum!');
  const [reportOpen, setReportOpen] = useState(false);

  const saved = isSaved(id as Id<'listings'>);
  const onToggleSave = () => {
    if (!toggleSave(id as Id<'listings'>)) router.push('/login');
  };

  const submitReport = (reason: string) => {
    setReportOpen(false);
    createReport({
      listingTitle: listing?.title ?? 'Eʼlon',
      reason,
      reporter: user?.name ?? user?.phone ?? 'Anonim',
    })
      .then(() =>
        Alert.alert('Yuborildi', 'Shikoyatingiz qabul qilindi. Rahmat!')
      )
      .catch(() => Alert.alert('Xatolik', 'Shikoyat yuborilmadi. Qayta urinib koʻring.'));
  };

  if (!listing) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <AppText className="text-muted">Yuklanmoqda...</AppText>
      </View>
    );
  }

  const similar = all.filter((l) => l._id !== listing._id).slice(0, 4);
  const details = [{ label: 'Shahar', value: listing.city }, ...listing.specs];

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View className="h-12 flex-row items-center px-3">
          <Pressable onPress={() => router.back()} hitSlop={10} className="h-9 w-9 items-center justify-center">
            <Ionicons name="arrow-back" size={24} color={BRAND_BLUE} />
          </Pressable>
          <AppText className="ml-1 flex-1 font-bold text-xl text-foreground" numberOfLines={1}>
            {listing.title.split(',')[0]}
          </AppText>
          <Pressable hitSlop={10} className="mr-2 h-9 w-9 items-center justify-center">
            <Ionicons name="share-social-outline" size={22} color={BRAND_BLUE} />
          </Pressable>
          <Pressable onPress={onToggleSave} hitSlop={10} className="h-9 w-9 items-center justify-center">
            <Ionicons name={saved ? 'heart' : 'heart-outline'} size={24} color={saved ? '#EF4444' : BRAND_BLUE} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 90 }}>
          {/* Hero image */}
          <View className="items-center justify-center bg-surface-secondary" style={{ height: 260 }}>
            {listing.photoUrls?.[0] ? (
              <Image source={{ uri: listing.photoUrls[0] }} contentFit="cover" style={{ width: '100%', height: '100%' }} />
            ) : (
              <Image source={CATEGORY_IMAGES[listing.category]} contentFit="contain" style={{ width: '75%', height: '85%' }} />
            )}
            <View className="absolute bottom-3 right-3 flex-row items-center rounded-md bg-black/60 px-2 py-1">
              <Ionicons name="camera" size={14} color="white" />
              <AppText className="ml-1 text-xs text-white">1/{listing.photoUrls?.length || 1}</AppText>
            </View>
          </View>

          {/* Price + title */}
          <View className="px-4 pt-4">
            <View className="flex-row items-center">
              <AppText className="font-bold text-3xl text-foreground">{listing.price}</AppText>
            </View>
            <AppText className="mt-1 text-base text-muted">{listing.title}</AppText>
          </View>

          {/* Details table */}
          <View className="mt-4 px-4">
            {details.map((d) => (
              <View key={d.label} className="flex-row justify-between border-b border-border py-3">
                <AppText className="text-base text-muted">{d.label}</AppText>
                <AppText className="text-base font-medium text-foreground">{d.value}</AppText>
              </View>
            ))}
          </View>

          {/* Call seller */}
          <Pressable
            className="mx-4 mt-4 flex-row items-center rounded-2xl px-4 py-4 active:opacity-80"
            style={{ backgroundColor: BRAND_BLUE + '12' }}
          >
            <Ionicons name="call" size={20} color={BRAND_BLUE} />
            <AppText className="ml-3 font-medium text-base" style={{ color: BRAND_BLUE }}>
              Sotuvchiga qoʻngʻiroq qilish {listing.phone}
            </AppText>
          </Pressable>

          {/* Share listing */}
          <Pressable className="mx-4 mt-3 flex-row items-center border-t border-border py-4 active:opacity-70">
            <Ionicons name="share-social-outline" size={20} color={BRAND_BLUE} />
            <AppText className="ml-3 flex-1 font-medium text-base" style={{ color: BRAND_BLUE }}>
              Ushbu eʼlonni yuborish
            </AppText>
            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
          </Pressable>

          {/* Report listing */}
          <Pressable
            onPress={() => setReportOpen(true)}
            className="mx-4 flex-row items-center border-y border-border py-4 active:opacity-70"
          >
            <Ionicons name="flag-outline" size={20} color="#EF4444" />
            <AppText className="ml-3 flex-1 font-medium text-base" style={{ color: '#EF4444' }}>
              Shikoyat qilish
            </AppText>
            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
          </Pressable>

          {/* Seller description */}
          <View className="mt-4 px-4">
            <AppText className="mb-1 font-bold text-lg text-foreground">Sotuvchidan maʼlumot</AppText>
            <AppText className="text-base leading-6 text-foreground">{listing.desc}</AppText>
          </View>

          {/* Bargain card */}
          <View className="mx-4 mt-4 overflow-hidden rounded-2xl" style={{ borderWidth: 2, borderColor: BRAND_BLUE }}>
            <View style={{ backgroundColor: BRAND_BLUE }} className="px-4 py-2.5">
              <AppText className="font-semibold text-base text-white">Sotuvchi bilan savdolashing</AppText>
            </View>
            <View className="bg-surface p-3">
              <View className="mb-3 h-12 flex-row items-center rounded-xl border border-border px-3">
                <TextInput
                  value={msg}
                  onChangeText={setMsg}
                  className="flex-1 text-base text-foreground"
                  style={{ fontFamily: 'Inter-Regular' }}
                />
                <Pressable hitSlop={8}>
                  <Ionicons name="send" size={20} color={BRAND_BLUE} />
                </Pressable>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {QUICK_MSGS.map((q) => (
                  <Pressable
                    key={q}
                    onPress={() => setMsg(q)}
                    className="rounded-full bg-surface-secondary px-4 py-2.5 active:opacity-70"
                  >
                    <AppText className="text-[15px] text-foreground">{q}</AppText>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          {/* Similar listings */}
          <AppText className="mb-3 mt-6 px-4 font-bold text-lg text-foreground">Oʻxshash eʼlonlar</AppText>
          <View className="flex-row flex-wrap justify-between px-4">
            {similar.map((l) => (
              <Pressable
                key={l._id}
                onPress={() => router.push({ pathname: '/listing/[id]', params: { id: l._id } })}
                style={{ width: '48.5%' }}
                className="mb-4 active:opacity-80"
              >
                <View className="items-center justify-center overflow-hidden rounded-xl bg-surface-secondary" style={{ height: 120 }}>
                  {l.photoUrls?.[0] ? (
                    <Image source={{ uri: l.photoUrls[0] }} contentFit="cover" style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <Image source={CATEGORY_IMAGES[l.category]} contentFit="contain" style={{ width: '80%', height: '80%' }} />
                  )}
                </View>
                <AppText className="mt-1.5 font-medium text-base" style={{ color: BRAND_BLUE }} numberOfLines={1}>
                  {l.title.split(',')[0]}
                </AppText>
                <AppText className="font-bold text-base text-foreground">{l.price}</AppText>
                <AppText className="text-sm text-muted">{l.city}</AppText>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Sticky bottom bar */}
        <View className="flex-row gap-3 border-t border-border px-4 py-2.5">
          <Pressable
            onPress={() => router.push({ pathname: '/chat/[id]', params: { id: 'seller-' + listing._id, name: 'Sotuvchi' } })}
            className="h-12 flex-1 flex-row items-center justify-center rounded-xl active:opacity-90"
            style={{ backgroundColor: BRAND_BLUE }}
          >
            <Ionicons name="paper-plane" size={18} color="white" />
            <AppText className="ml-2 font-semibold text-base text-white">Chat</AppText>
          </Pressable>
          <Pressable
            className="h-12 flex-[1.4] flex-row items-center justify-center rounded-xl active:opacity-90"
            style={{ backgroundColor: '#22C55E' }}
          >
            <Ionicons name="call" size={18} color="white" />
            <AppText className="ml-2 font-semibold text-base text-white">Qoʻngʻiroq qilish +998</AppText>
          </Pressable>
        </View>

        {/* Report reason sheet */}
        <Modal visible={reportOpen} transparent animationType="slide" onRequestClose={() => setReportOpen(false)}>
          <Pressable className="flex-1 bg-black/40" onPress={() => setReportOpen(false)} />
          <View className="rounded-t-3xl bg-background px-5 pb-8 pt-5">
            <View className="mb-3 flex-row items-center justify-between">
              <AppText className="font-bold text-xl text-foreground">Shikoyat sababi</AppText>
              <Pressable onPress={() => setReportOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={26} color="#9ca3af" />
              </Pressable>
            </View>
            <AppText className="mb-4 text-base text-muted">
              Nega bu eʼlondan shikoyat qilmoqchisiz?
            </AppText>
            {REPORT_REASONS.map((r) => (
              <Pressable
                key={r}
                onPress={() => submitReport(r)}
                className="flex-row items-center justify-between border-b border-border py-4 active:opacity-60"
              >
                <AppText className="text-lg text-foreground">{r}</AppText>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </Pressable>
            ))}
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}
