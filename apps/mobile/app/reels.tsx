import { Ionicons } from '@expo/vector-icons';
import { api } from '@halolmia/backend/convex/_generated/api';
import type { Id } from '@halolmia/backend/convex/_generated/dataModel';
import { FlashList } from '@shopify/flash-list';
import { useMutation, useQuery } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Chip } from 'heroui-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/app-text';
import { BRAND_BLUE } from '../constants/theme';
import { useAuth } from '../lib/auth';
import { useVideoPlayer, VideoView } from '../lib/optional-native';

type Reel = FunctionReturnType<typeof api.reels.list>[number];

function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(n);
}

function cacheableSource(url?: string | null) {
  if (!url) return '';
  if (url.includes('.m3u8')) return url;
  return { uri: url, useCaching: true };
}

/**
 * expo-video swaps/releases the native player whenever `useVideoPlayer`'s
 * source argument changes (as it does here when a slide scrolls out of the
 * "near" window). A pending effect cleanup can still reference the just-
 * released player, so play/pause calls are best-effort.
 */
function safeVideoCall(fn: () => void) {
  try {
    fn();
  } catch {
    // player was already released — nothing to do
  }
}

export default function ReelsScreen() {
  const router = useRouter();
  const { start, sellerId } = useLocalSearchParams<{ start?: string; sellerId?: string }>();
  const { userId, user } = useAuth();
  const { height } = useWindowDimensions();
  const globalReelsQuery = useQuery(api.reels.list, sellerId ? 'skip' : userId ? { userId, limit: 40 } : { limit: 40 });
  const sellerReelsQuery = useQuery(
    api.reels.bySeller,
    sellerId ? { sellerId: sellerId as Id<'users'>, userId: userId ?? undefined, limit: 40 } : 'skip'
  );
  const reelsQuery = sellerId ? sellerReelsQuery : globalReelsQuery;
  const reels = useMemo(() => reelsQuery ?? [], [reelsQuery]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [commentsFor, setCommentsFor] = useState<Reel | null>(null);

  const startIndex = useMemo(
    () => (start ? reels.findIndex((r) => r._id === start) : -1),
    [reels, start]
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
      const first = viewableItems.find((item) => item.index !== null);
      if (first?.index !== null && first?.index !== undefined) setActiveIndex(first.index);
    },
    []
  );

  if (reels.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-black px-8">
        <Ionicons name="play-circle-outline" size={56} color="#fff" />
        <AppText className="mt-4 text-center font-bold text-2xl text-white">
          Video bozor hali bosh
        </AppText>
        <AppText className="mt-2 text-center text-base leading-6 text-white/70">
          Admin paneldan birinchi hayvon videosini qoshing.
        </AppText>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}
          className="mt-6 rounded-full bg-white px-6 py-3 active:opacity-80"
        >
          <AppText className="font-semibold text-black">Ortga qaytish</AppText>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <FlashList
        data={reels}
        keyExtractor={(item) => item._id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        initialScrollIndex={startIndex >= 0 ? startIndex : undefined}
        getItemType={() => 'reel'}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 72 }}
        renderItem={({ item, index }) => (
          <ReelSlide
            reel={item}
            active={index === activeIndex}
            near={Math.abs(index - activeIndex) <= 1}
            height={height}
            userId={userId}
            userName={user?.name ?? user?.phone ?? 'Foydalanuvchi'}
            onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}
            onComments={() => setCommentsFor(item)}
          />
        )}
      />
      <CommentsSheet
        reel={commentsFor}
        userId={userId}
        userName={user?.name ?? user?.phone ?? 'Foydalanuvchi'}
        onClose={() => setCommentsFor(null)}
      />
    </View>
  );
}

function ReelSlide({
  reel,
  active,
  near,
  height,
  userId,
  userName,
  onBack,
  onComments,
}: {
  reel: Reel;
  active: boolean;
  near: boolean;
  height: number;
  userId: Id<'users'> | null;
  userName: string;
  onBack: () => void;
  onComments: () => void;
}) {
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();
  const [manualPaused, setManualPaused] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const viewRecorded = useRef(false);
  const watchStartedAt = useRef<number | null>(null);
  const lastTapAt = useRef(0);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;

  const player = useVideoPlayer(near ? cacheableSource(reel.videoUrl) : '', (p) => {
    p.loop = true;
  });

  const toggleLike = useMutation(api.reels.toggleLike);
  const toggleSave = useMutation(api.reels.toggleSave);
  const recordView = useMutation(api.reels.recordView);
  const recordWatch = useMutation(api.reels.recordWatch);
  const recordTap = useMutation(api.reels.recordTap);
  const openThread = useMutation(api.messages.openThread);
  const toggleFollow = useMutation(api.follows.toggle);
  const createReport = useMutation(api.reports.create);

  useEffect(() => {
    if (active && !manualPaused) {
      safeVideoCall(() => player.play());
      if (!viewRecorded.current) {
        viewRecorded.current = true;
        recordView({ reelId: reel._id }).catch(() => {});
      }
      watchStartedAt.current = Date.now();
    } else {
      safeVideoCall(() => player.pause());
      if (watchStartedAt.current) {
        const ms = Date.now() - watchStartedAt.current;
        watchStartedAt.current = null;
        if (ms > 800) recordWatch({ reelId: reel._id, ms }).catch(() => {});
      }
    }
    return () => {
      safeVideoCall(() => player.pause());
    };
  }, [active, manualPaused, player, recordView, recordWatch, reel._id]);

  const requireLogin = () => {
    if (userId) return false;
    router.push('/login');
    return true;
  };

  const onLike = () => {
    if (requireLogin()) return;
    toggleLike({ userId: userId!, reelId: reel._id });
  };

  const burstHeart = () => {
    heartScale.setValue(0.35);
    heartOpacity.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(heartOpacity, {
          toValue: 1,
          duration: 70,
          useNativeDriver: true,
        }),
        Animated.timing(heartOpacity, {
          toValue: 0,
          delay: 520,
          duration: 180,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.spring(heartScale, {
          toValue: 1,
          damping: 8,
          stiffness: 180,
          mass: 0.55,
          useNativeDriver: true,
        }),
        Animated.timing(heartScale, {
          toValue: 1.18,
          duration: 180,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const onVideoPress = () => {
    const now = Date.now();
    if (now - lastTapAt.current < 280) {
      if (singleTapTimer.current) {
        clearTimeout(singleTapTimer.current);
        singleTapTimer.current = null;
      }
      lastTapAt.current = 0;
      if (requireLogin()) return;
      if (!reel.viewerLiked) toggleLike({ userId: userId!, reelId: reel._id });
      burstHeart();
      return;
    }

    lastTapAt.current = now;
    singleTapTimer.current = setTimeout(() => {
      setManualPaused((v) => !v);
      singleTapTimer.current = null;
    }, 260);
  };

  const onSave = () => {
    if (requireLogin()) return;
    toggleSave({ userId: userId!, reelId: reel._id });
  };

  const onFollow = () => {
    if (requireLogin() || !reel.sellerId || reel.sellerId === userId) return;
    toggleFollow({ followerId: userId!, sellerId: reel.sellerId });
  };

  const onChat = async () => {
    if (requireLogin()) return;
    recordTap({ reelId: reel._id, kind: 'chat' }).catch(() => {});
    if (reel.listingId) {
      try {
        const threadId = await openThread({ meId: userId!, listingId: reel.listingId });
        router.push({
          pathname: '/chat/[id]',
          params: {
            id: threadId,
            name: reel.sellerName ?? 'Sotuvchi',
            sellerId: reel.sellerId ?? '',
          },
        });
        return;
      } catch {
        /* profile fallback below */
      }
    }
    if (reel.sellerId) router.push({ pathname: '/seller/[id]', params: { id: reel.sellerId } });
  };

  const onCall = () => {
    recordTap({ reelId: reel._id, kind: 'call' }).catch(() => {});
    if (reel.sellerPhone) Linking.openURL(`tel:${reel.sellerPhone}`).catch(() => {});
  };

  const submitReport = (reason: string) => {
    setSafetyOpen(false);
    createReport({
      listingTitle: reel.title,
      reason,
      reporter: userName,
      sellerId: reel.sellerId ?? undefined,
    })
      .then(() => Alert.alert('Yuborildi', 'Shikoyat adminlarga yuborildi. Rahmat!'))
      .catch(() => Alert.alert('Xatolik', 'Shikoyat yuborilmadi. Qayta urinib ko`ring.'));
  };

  useEffect(() => {
    return () => {
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
    };
  }, []);

  return (
    <View style={{ height }} className="bg-black">
      <Pressable className="flex-1" onPress={onVideoPress}>
        {reel.thumbUrl ? (
          <Image
            source={{ uri: reel.thumbUrl }}
            contentFit="cover"
            style={{ position: 'absolute', width: '100%', height: '100%' }}
          />
        ) : null}
        <VideoView
          player={player}
          style={{ position: 'absolute', width: '100%', height: '100%' }}
          contentFit="cover"
          nativeControls={false}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.45)', 'transparent', 'rgba(0,0,0,0.82)']}
          locations={[0, 0.42, 1]}
          style={{ position: 'absolute', width: '100%', height: '100%' }}
        />
        {manualPaused && active ? (
          <View className="absolute inset-0 items-center justify-center">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-black/45">
              <Ionicons name="play" size={34} color="#fff" style={{ marginLeft: 4 }} />
            </View>
          </View>
        ) : null}
        <Animated.View
          pointerEvents="none"
          className="absolute inset-0 items-center justify-center"
          style={{
            opacity: heartOpacity,
            transform: [{ scale: heartScale }, { rotate: '-8deg' }],
          }}
        >
          <Ionicons name="heart" size={118} color="#fff" />
          <View className="absolute h-24 w-24 rounded-full bg-white/15" />
        </Animated.View>
      </Pressable>

      <View
        className="absolute left-0 right-0 flex-row items-center justify-between px-4"
        style={{ top: top + 8 }}
      >
        <Pressable onPress={onBack} hitSlop={10} className="h-10 w-10 items-center justify-center rounded-full bg-black/35">
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <View className="rounded-full bg-black/30 px-3 py-1.5">
          <AppText className="font-bold text-base text-white">Video bozor</AppText>
        </View>
        <View className="h-10 w-10" />
      </View>

      <View className="absolute right-3 items-center gap-4" style={{ bottom: bottom + 150 }}>
        <RailButton
          icon={reel.viewerLiked ? 'heart' : 'heart-outline'}
          label={compact(reel.likes + (reel.viewerLiked ? 0 : 0))}
          active={reel.viewerLiked}
          onPress={onLike}
        />
        <RailButton icon="chatbubble-outline" label={compact(reel.comments)} onPress={onComments} />
        <RailButton
          icon={reel.viewerSaved ? 'bookmark' : 'bookmark-outline'}
          label={compact(reel.saves)}
          active={reel.viewerSaved}
          onPress={onSave}
        />
        <RailButton icon="flag-outline" label="Shikoyat" onPress={() => setSafetyOpen(true)} />
      </View>

      <View className="absolute left-4 right-20" style={{ bottom: bottom + 22 }}>
        <View className="mb-3 flex-row items-center">
          <Pressable
            onPress={() =>
              reel.sellerId && router.push({ pathname: '/seller/[id]', params: { id: reel.sellerId } })
            }
            className="h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-white"
          >
            {reel.sellerAvatarUrl ? (
              <Image source={{ uri: reel.sellerAvatarUrl }} contentFit="cover" style={{ width: '100%', height: '100%' }} />
            ) : (
              <View className="h-full w-full items-center justify-center bg-white/20">
                <AppText className="font-bold text-white">
                  {(reel.sellerName ?? 'H').charAt(0).toUpperCase()}
                </AppText>
              </View>
            )}
          </Pressable>
          <Pressable
            onPress={() =>
              reel.sellerId && router.push({ pathname: '/seller/[id]', params: { id: reel.sellerId } })
            }
            className="ml-2 flex-1"
          >
            <View className="flex-row items-center">
              <AppText className="font-bold text-[15px] text-white" numberOfLines={1}>
                {reel.sellerName ?? 'Sotuvchi'}
              </AppText>
              {reel.sellerIsDealer ? (
                <Ionicons name="checkmark-circle" size={15} color="#60A5FA" style={{ marginLeft: 4 }} />
              ) : null}
            </View>
            <AppText className="mt-0.5 text-xs text-white/75" numberOfLines={1}>
              {reel.city ?? 'O`zbekiston'} {reel.category ? `· ${reel.category}` : ''}
            </AppText>
          </Pressable>
          {reel.sellerId && reel.sellerId !== userId ? (
            <Pressable
              onPress={onFollow}
              className="ml-2 rounded-lg border border-white/70 px-3 py-1.5 active:opacity-80"
            >
              <AppText className="font-semibold text-sm text-white">
                {reel.viewerFollowing ? 'Following' : 'Follow'}
              </AppText>
            </Pressable>
          ) : null}
        </View>

        <Pressable
          onPress={() => setDetailsOpen(true)}
          className="overflow-hidden rounded-[22px] border border-white/20 active:opacity-85"
          style={{ backgroundColor: 'rgba(10, 15, 25, 0.34)' }}
        >
          <BlurView intensity={26} tint="dark" className="px-3.5 py-3">
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(255,255,255,0.24)', 'rgba(255,255,255,0.04)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View className="flex-row items-center">
              <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-white/18">
                <Ionicons name="information-circle-outline" size={21} color="#fff" />
              </View>
              <View className="flex-1">
                {!!reel.price && (
                  <AppText className="font-bold text-[17px] leading-5 text-white" numberOfLines={1}>
                    {reel.price}
                  </AppText>
                )}
                <AppText className="font-semibold text-sm leading-5 text-white/88" numberOfLines={reel.price ? 1 : 2}>
                  {reel.title}
                </AppText>
              </View>
              <Ionicons name="chevron-up" size={18} color="rgba(255,255,255,0.72)" />
            </View>
          </BlurView>
        </Pressable>
        {!!reel.caption && (
          <AppText className="mt-1 text-sm leading-5 text-white/85" numberOfLines={2}>
            {reel.caption}
          </AppText>
        )}

        <View className="mt-4 flex-row gap-2">
          <Pressable
            onPress={onChat}
            className="h-12 flex-1 flex-row items-center justify-center rounded-xl bg-white active:opacity-90"
          >
            <Ionicons name="chatbubble-ellipses" size={19} color={BRAND_BLUE} />
            <AppText className="ml-2 font-bold text-base" style={{ color: BRAND_BLUE }}>
              Chat
            </AppText>
          </Pressable>
          <Pressable
            onPress={onCall}
            className="h-12 flex-1 flex-row items-center justify-center rounded-xl active:opacity-90"
            style={{ backgroundColor: BRAND_BLUE }}
          >
            <Ionicons name="call" size={19} color="#fff" />
            <AppText className="ml-2 font-bold text-base text-white">Call</AppText>
          </Pressable>
        </View>
      </View>
      <SafetySheet
        visible={safetyOpen}
        onClose={() => setSafetyOpen(false)}
        onReport={submitReport}
      />
      <ProductDetailSheet
        visible={detailsOpen}
        reel={reel}
        onClose={() => setDetailsOpen(false)}
      />
    </View>
  );
}

const REPORT_REASONS = [
  'Firibgarlik gumoni',
  'Noto`g`ri ma`lumot',
  'Nomaqbul kontent',
  'Narx yoki hayvon mos emas',
];

function SafetySheet({
  visible,
  onClose,
  onReport,
}: {
  visible: boolean;
  onClose: () => void;
  onReport: (reason: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/45" onPress={onClose} />
      <View className="rounded-t-3xl bg-background px-5 pb-8 pt-5">
        <View className="mb-4 flex-row items-center justify-between">
          <View>
            <AppText className="font-bold text-xl text-foreground">Shikoyat</AppText>
            <AppText className="mt-1 text-sm text-muted">Firibgarlik yoki xavfli kontentni belgilang.</AppText>
          </View>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={26} color="#94A3B8" />
          </Pressable>
        </View>
        <View className="gap-2">
          {REPORT_REASONS.map((reason) => (
            <Pressable
              key={reason}
              onPress={() => onReport(reason)}
              className="flex-row items-center rounded-2xl bg-surface-secondary px-4 py-3 active:opacity-80"
            >
              <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-red-100">
                <Ionicons name="flag-outline" size={19} color="#DC2626" />
              </View>
              <AppText className="flex-1 font-semibold text-base text-foreground">{reason}</AppText>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

function findSpec(
  specs: { label: string; value: string }[] | undefined,
  keys: string[]
) {
  const normalized = (text: string) => text.toLowerCase().replace(/[\s'`'.,-]+/g, '');
  return specs?.find((spec) => keys.some((key) => normalized(spec.label).includes(normalized(key))))?.value;
}

function ProductDetailSheet({
  visible,
  reel,
  onClose,
}: {
  visible: boolean;
  reel: Reel;
  onClose: () => void;
}) {
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const listing = useQuery(api.listings.get, reel.listingId ? { id: reel.listingId } : 'skip');
  const specs = listing?.specs;
  const title = listing?.title ?? reel.title;
  const price = listing?.price ?? reel.price;
  const rows = [
    { icon: 'scale-outline', label: 'Vazn', value: findSpec(specs, ['vazn', 'weight']) },
    { icon: 'ribbon-outline', label: 'Zot', value: findSpec(specs, ['zot', 'breed']) },
    { icon: 'time-outline', label: 'Yosh', value: findSpec(specs, ['yosh', 'age']) },
    { icon: 'document-text-outline', label: 'Hujjat', value: findSpec(specs, ['hujjat', 'document']) },
    { icon: 'car-outline', label: 'Yetkazish', value: findSpec(specs, ['yetkaz', 'delivery']) },
    { icon: 'location-outline', label: 'Shahar', value: listing?.city ?? reel.city },
  ] as const;
  const chips = [
    listing?.category ?? reel.category,
    reel.sellerIsDealer ? 'Rasmiy diler' : undefined,
    findSpec(specs, ['hujjat', 'document']) ? 'Hujjat bor' : undefined,
    findSpec(specs, ['yetkaz', 'delivery']) ? 'Yetkazish bor' : undefined,
  ].filter((item): item is string => !!item);
  const description = listing?.desc ?? reel.caption;
  const openListing = () => {
    if (!reel.listingId) return;
    onClose();
    router.push({ pathname: '/listing/[id]', params: { id: reel.listingId } });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/30">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="px-3 pb-3" style={{ paddingBottom: bottom + 10 }}>
          <View
            className="overflow-hidden rounded-[34px] border border-white/20"
            style={{
              backgroundColor: 'rgba(9, 14, 24, 0.58)',
              shadowColor: '#000',
              shadowOpacity: 0.36,
              shadowRadius: 28,
              shadowOffset: { width: 0, height: 18 },
              elevation: 16,
            }}
          >
            <BlurView intensity={48} tint="dark">
              <LinearGradient
                pointerEvents="none"
                colors={[
                  'rgba(255,255,255,0.30)',
                  'rgba(255,255,255,0.08)',
                  'rgba(255,255,255,0.02)',
                ]}
                locations={[0, 0.36, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.92, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/12" />
              <View className="absolute left-8 top-0 h-px w-40 bg-white/55" />

              <View className="items-center pt-2.5">
                <View className="h-1.5 w-11 rounded-full bg-white/40" />
              </View>

              <View className="px-5 pb-5 pt-4">
                <View className="mb-4 flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <AppText className="text-xs font-semibold uppercase tracking-[1.6px] text-white/55">
                      Mahsulot tafsilotlari
                    </AppText>
                    <AppText className="mt-1 font-bold text-2xl leading-7 text-white" numberOfLines={2}>
                      {title}
                    </AppText>
                    {!!price && (
                      <AppText className="mt-2 font-display text-3xl text-white" numberOfLines={1}>
                        {price}
                      </AppText>
                    )}
                  </View>
                  <Pressable
                    onPress={onClose}
                    hitSlop={10}
                    className="h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/12 active:opacity-75"
                  >
                    <Ionicons name="close" size={22} color="#fff" />
                  </Pressable>
                </View>

                <View className="mb-4 flex-row flex-wrap gap-2">
                  {chips.slice(0, 4).map((chip, index) => (
                    <Chip
                      key={`${chip}-${index}`}
                      size="sm"
                      variant={index === 0 ? 'primary' : 'secondary'}
                      color={index === 0 ? 'accent' : 'default'}
                      className="border border-white/15 bg-white/14"
                    >
                      <Chip.Label className="font-semibold text-white">{chip}</Chip.Label>
                    </Chip>
                  ))}
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 4 }}
                  style={{ maxHeight: 320 }}
                >
                  <View className="flex-row flex-wrap gap-2.5">
                    {rows.map((row) => (
                      <View
                        key={row.label}
                        className="min-h-[78px] rounded-[22px] border border-white/12 bg-white/10 px-3 py-3"
                        style={{ width: '48%' }}
                      >
                        <View className="mb-2 flex-row items-center">
                          <View className="mr-2 h-7 w-7 items-center justify-center rounded-full bg-white/12">
                            <Ionicons name={row.icon} size={15} color="rgba(255,255,255,0.86)" />
                          </View>
                          <AppText className="text-xs font-semibold text-white/58">{row.label}</AppText>
                        </View>
                        <AppText className="font-bold text-sm leading-5 text-white" numberOfLines={2}>
                          {row.value || 'Kiritilmagan'}
                        </AppText>
                      </View>
                    ))}
                  </View>

                  {!!description && (
                    <View className="mt-3 rounded-[24px] border border-white/12 bg-black/18 p-4">
                      <View className="mb-2 flex-row items-center">
                        <Ionicons name="reader-outline" size={16} color="rgba(255,255,255,0.72)" />
                        <AppText className="ml-2 text-xs font-semibold uppercase tracking-[1.2px] text-white/58">
                          Izoh
                        </AppText>
                      </View>
                      <AppText className="text-sm leading-5 text-white/82">{description}</AppText>
                    </View>
                  )}
                </ScrollView>

                <View className="mt-4 flex-row gap-2">
                  <Pressable
                    onPress={openListing}
                    disabled={!reel.listingId}
                    className="h-13 flex-1 flex-row items-center justify-center rounded-2xl bg-white active:opacity-90 disabled:opacity-50"
                  >
                    <Ionicons name="open-outline" size={18} color={BRAND_BLUE} />
                    <AppText className="ml-2 font-bold text-base" style={{ color: BRAND_BLUE }}>
                      E'lonni ochish
                    </AppText>
                  </Pressable>
                  <Pressable
                    onPress={onClose}
                    className="h-13 w-14 items-center justify-center rounded-2xl border border-white/16 bg-white/12 active:opacity-80"
                  >
                    <Ionicons name="chevron-down" size={22} color="#fff" />
                  </Pressable>
                </View>
              </View>
            </BlurView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function RailButton({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={8} className="items-center active:opacity-75">
      <Ionicons name={icon} size={34} color={active ? '#EF4444' : '#fff'} />
      {!!label && <AppText className="mt-0.5 text-xs font-bold text-white">{label}</AppText>}
    </Pressable>
  );
}

function CommentsSheet({
  reel,
  userId,
  userName,
  onClose,
}: {
  reel: Reel | null;
  userId: Id<'users'> | null;
  userName: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [text, setText] = useState('');
  const commentsQuery = useQuery(api.reels.comments, reel ? { reelId: reel._id } : 'skip');
  const comments = commentsQuery ?? [];
  const loading = !!reel && commentsQuery === undefined;
  const addComment = useMutation(api.reels.addComment);

  useEffect(() => {
    if (!reel) setText('');
  }, [reel]);

  const submit = async () => {
    if (!reel || !text.trim()) return;
    if (!userId) {
      onClose();
      router.push('/login');
      return;
    }
    await addComment({ reelId: reel._id, userId, userName, text });
    setText('');
  };

  return (
    <Modal visible={!!reel} transparent animationType="slide" presentationStyle="overFullScreen" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end"
        style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      >
        <Pressable className="absolute inset-0" onPress={onClose} />
          <View
            className="overflow-hidden rounded-t-[28px] bg-background"
            style={{ height: Math.min(620, Math.max(500, height * 0.72)) + bottom }}
          >
            <View className="items-center pt-2">
              <View className="h-1.5 w-11 rounded-full bg-neutral-300" />
            </View>

            <View className="flex-row items-center justify-between px-5 pb-3 pt-4">
              <View>
                <AppText className="font-bold text-2xl text-foreground">Izohlar</AppText>
                <AppText className="mt-0.5 text-sm text-muted">
                  {loading ? 'Yuklanmoqda...' : comments.length ? `${comments.length} ta izoh` : 'Hali izoh yoq'}
                </AppText>
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={10}
                className="h-10 w-10 items-center justify-center rounded-full bg-surface-secondary active:opacity-80"
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 14, flexGrow: 1 }}
            >
              {loading ? (
                <View className="flex-1 items-center justify-center py-12">
                  <ActivityIndicator color={BRAND_BLUE} />
                </View>
              ) : comments.length === 0 ? (
                <View className="flex-1 items-center justify-center py-12">
                  <View className="h-14 w-14 items-center justify-center rounded-full bg-surface-secondary">
                    <Ionicons name="chatbubble-ellipses-outline" size={28} color="#94A3B8" />
                  </View>
                  <AppText className="mt-3 text-center font-semibold text-base text-foreground">
                    Birinchi izohni yozing
                  </AppText>
                  <AppText className="mt-1 text-center text-sm text-muted">
                    Savol, narx yoki fikringizni qoldiring.
                  </AppText>
                </View>
              ) : (
                comments.map((c) => (
                  <View key={c._id} className="mb-4 flex-row items-start">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-secondary">
                      <AppText className="font-bold text-sm text-foreground">
                        {(c.userName || 'F').charAt(0).toUpperCase()}
                      </AppText>
                    </View>
                    <View className="ml-3 flex-1 rounded-2xl bg-surface-secondary px-3.5 py-2.5">
                      <AppText className="font-semibold text-sm text-foreground">
                        {c.userName || 'Foydalanuvchi'}
                      </AppText>
                      <AppText className="mt-1 text-sm leading-5 text-foreground">{c.text}</AppText>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <View className="border-t border-separator bg-background px-4 pb-3 pt-3" style={{ paddingBottom: bottom + 10 }}>
              <View className="min-h-12 flex-row items-center rounded-2xl bg-surface-secondary px-3 py-1.5">
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder="Izoh yozing..."
                  placeholderTextColor="#9ca3af"
                  className="max-h-24 min-h-10 flex-1 py-2 text-base text-foreground"
                  multiline
                  style={{ fontFamily: 'Inter-Regular' }}
                />
                <Pressable
                  onPress={submit}
                  disabled={!text.trim()}
                  className="ml-2 h-10 w-10 items-center justify-center rounded-full active:opacity-80"
                  style={{ backgroundColor: text.trim() ? BRAND_BLUE : '#CBD5E1' }}
                >
                  <Ionicons name="send" size={18} color="#fff" />
                </Pressable>
              </View>
            </View>
          </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
