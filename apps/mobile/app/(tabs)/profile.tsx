import { Ionicons } from '@expo/vector-icons';
import { api } from '@halolmia/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/app-text';
import { Logo } from '../../components/logo';
import { CATEGORY_IMAGES } from '../../constants/category-images';
import { BRAND_BLUE } from '../../constants/theme';
import { useAuth } from '../../lib/auth';

const STATUS_META: Record<string, { label: string; bg: string }> = {
  active: { label: 'Faol', bg: '#86EFAC' },
  pending: { label: 'Tekshiruvda', bg: '#FCD34D' },
  rejected: { label: 'Rad etilgan', bg: '#FCA5A5' },
};

export default function Profile() {
  const router = useRouter();
  const { userId, user, logout } = useAuth();

  const listings = useQuery(
    api.listings.byOwner,
    userId ? { ownerId: userId } : 'skip'
  );

  // Not logged in → login prompt.
  if (!userId) {
    return (
      <View className="flex-1" style={{ backgroundColor: '#F4F5F7' }}>
        <SafeAreaView className="flex-1" edges={['top']}>
          <View className="flex-row items-center justify-between px-4 pb-2 pt-2">
            <AppText className="font-bold text-2xl text-foreground">Profil</AppText>
            <Pressable onPress={() => router.push('/settings')} hitSlop={8} className="flex-row items-center active:opacity-70">
              <Ionicons name="settings-outline" size={20} color={BRAND_BLUE} />
            </Pressable>
          </View>

          <View className="flex-1 items-center justify-center px-8">
            <View className="mb-5 h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: BRAND_BLUE + '1A' }}>
              <Ionicons name="person-outline" size={38} color={BRAND_BLUE} />
            </View>
            <AppText className="mb-2 text-center font-bold text-xl text-foreground">
              Hisobingizga kiring
            </AppText>
            <AppText className="mb-8 text-center text-base leading-6 text-muted">
              Eʼlon joylash, saqlash va sotuvchilar bilan bogʻlanish uchun kiring.
            </AppText>
            <Pressable
              onPress={() => router.push('/login')}
              className="h-14 w-full items-center justify-center rounded-2xl active:opacity-90"
              style={{ backgroundColor: BRAND_BLUE }}
            >
              <AppText className="font-semibold text-base text-white">Kirish</AppText>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: '#F4F5F7' }}>
      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 pb-2 pt-2">
            <AppText className="font-bold text-2xl text-foreground">
              {user?.phone ?? user?.name ?? 'Profil'}
            </AppText>
            <Pressable onPress={() => router.push('/settings')} hitSlop={8} className="flex-row items-center active:opacity-70">
              <Ionicons name="settings-outline" size={20} color={BRAND_BLUE} />
              <AppText className="ml-1.5 font-medium text-base" style={{ color: BRAND_BLUE }}>Sozlamalar</AppText>
            </Pressable>
          </View>

          {/* Balance card */}
          <View className="mx-4 mt-3 rounded-2xl bg-surface p-4">
            <View className="flex-row items-center justify-between">
              <View>
                <AppText className="font-semibold text-lg text-foreground">Halolmi hisobi</AppText>
                <AppText className="mt-1 text-base text-muted">💰 0 soʻm</AppText>
              </View>
              <Pressable className="items-center justify-center rounded-xl px-5 py-3 active:opacity-80" style={{ backgroundColor: BRAND_BLUE + '1A' }}>
                <AppText className="font-semibold text-base" style={{ color: BRAND_BLUE }}>Toʻldirish</AppText>
              </Pressable>
            </View>
            <View className="my-3 h-px bg-border" />
            <View className="flex-row items-center">
              <View className="mr-3 h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: BRAND_BLUE }}>
                <AppText className="text-white" style={{ fontFamily: 'Fredoka-SemiBold', fontSize: 16 }}>
                  {(user?.name ?? 'H').charAt(0).toUpperCase()}
                </AppText>
              </View>
              <AppText className="flex-1 font-medium text-base text-foreground">{user?.name ?? 'Foydalanuvchi'}</AppText>
            </View>
          </View>

          {/* My listings */}
          <AppText className="mb-2 mt-5 px-4 font-bold text-lg text-foreground">
            Mening eʼlonlarim
          </AppText>

          {listings === undefined ? (
            <View className="mx-4 rounded-2xl bg-surface p-6 items-center">
              <AppText className="text-muted">Yuklanmoqda...</AppText>
            </View>
          ) : listings.length === 0 ? (
            <View className="mx-4 rounded-2xl bg-surface p-6 items-center">
              <AppText className="mb-3 text-center text-base text-muted">
                Hali eʼloningiz yoʻq.
              </AppText>
              <Pressable
                onPress={() => router.push('/sell')}
                className="h-12 flex-row items-center justify-center rounded-xl px-5 active:opacity-90"
                style={{ backgroundColor: BRAND_BLUE }}
              >
                <AppText className="font-semibold text-base text-white">Eʼlon joylash</AppText>
              </Pressable>
            </View>
          ) : (
            listings.map((l) => {
              const meta = STATUS_META[l.status] ?? STATUS_META.pending;
              const img = CATEGORY_IMAGES[l.category] ?? CATEGORY_IMAGES.cattle;
              return (
                <Pressable
                  key={l._id}
                  onPress={() => router.push({ pathname: '/listing/[id]', params: { id: l._id } })}
                  className="mx-4 mb-3 rounded-2xl bg-surface p-4 active:opacity-90"
                >
                  <AppText className="font-semibold text-base text-foreground">{l.title}</AppText>
                  <AppText className="mb-3 mt-0.5 font-bold text-xl text-foreground">{l.price}</AppText>
                  <View className="flex-row">
                    <View className="mr-4 items-center justify-center overflow-hidden rounded-xl bg-surface-secondary" style={{ width: 130, height: 100 }}>
                      {l.photoUrls?.[0] ? (
                        <Image source={{ uri: l.photoUrls[0] }} contentFit="cover" style={{ width: '100%', height: '100%' }} />
                      ) : (
                        <Image source={img} contentFit="contain" style={{ width: '86%', height: '86%' }} />
                      )}
                    </View>
                    <View className="flex-1 justify-center">
                      <View className="self-start rounded-md px-2.5 py-1" style={{ backgroundColor: meta.bg }}>
                        <AppText className="text-sm font-medium text-foreground">{meta.label}</AppText>
                      </View>
                      <AppText className="mt-2 text-sm leading-5 text-muted">{l.city}</AppText>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}

          {/* Logout */}
          <Pressable
            onPress={async () => {
              await logout();
              router.replace('/home');
            }}
            className="mx-4 mt-4 h-12 flex-row items-center justify-center rounded-xl bg-surface active:opacity-80"
          >
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <AppText className="ml-2 font-semibold text-base" style={{ color: '#EF4444' }}>Chiqish</AppText>
          </Pressable>

          {/* Version */}
          <View className="mt-8 items-center">
            <Logo className="text-[#0F172A]" size={18} />
            <AppText className="mt-1 text-sm text-muted">1.0.0 versiyasi</AppText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
