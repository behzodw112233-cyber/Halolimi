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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

function shouldUseCloudflareFrame(reel: Reel) {
  return Platform.OS === 'web' && reel.videoProvider === 'cloudflare' && !!reel.providerVideoId;
}

function cloudflareFrameUrl(uid: string, playing: boolean) {
  const params = new URLSearchParams({
    autoplay: playing ? 'true' : 'false',
    muted: 'true',
    loop: 'true',
    controls: 'false',
    preload: 'true',
  });
  return `https://iframe.videodelivery.net/${uid}?${params.toString()}`;
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
  const { top, bottom } = useSafeAreaInsets();
  const globalReelsQuery = useQuery(api.reels.list, sellerId ? 'skip' : userId ? { userId, limit: 40 } : { limit: 40 });
  const sellerReelsQuery = useQuery(
    api.reels.bySeller,
    sellerId ? { sellerId: sellerId as Id<'users'>, userId: userId ?? undefined, limit: 40 } : 'skip'
  );
  const reelsQuery = sellerId ? sellerReelsQuery : globalReelsQuery;
  const reels = useMemo(() => reelsQuery ?? [], [reelsQuery]);
  const isLoading = reelsQuery === undefined;
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

  useEffect(() => {
    const prefetch = (Image as unknown as { prefetch?: (urls: string | string[]) => Promise<unknown> }).prefetch;
    if (!prefetch || !reels.length) return;
    const targets = reels
      .slice(Math.max(0, activeIndex - 1), activeIndex + 4)
      .map((reel) => reel.thumbUrl)
      .filter((url): url is string => !!url);
    if (targets.length) prefetch(targets).catch(() => {});
  }, [activeIndex, reels]);

  if (isLoading) {
    return <ReelsLoadingSkeleton onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))} />;
  }

  if (reels.length === 0) {
    return (
      <EmptyReelsState
        top={top}
        bottom={bottom}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}
        onCreate={() => router.push('/video-create' as never)}
      />
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
            near={index >= activeIndex - 1 && index <= activeIndex + 2}
            height={height}
            userId={userId}
            userName={user?.name ?? user?.phone ?? 'Foydalanuvchi'}
            onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}
            onComments={() => setCommentsFor(item)}
          />
        )}
      />
      <VideoWarmup url={reels[activeIndex + 1]?.videoUrl} />
      <VideoWarmup url={reels[activeIndex + 2]?.videoUrl} />
      <CommentsSheet
        reel={commentsFor}
        userId={userId}
        userName={user?.name ?? user?.phone ?? 'Foydalanuvchi'}
        onClose={() => setCommentsFor(null)}
      />
    </View>
  );
}

function EmptyReelsState({
  top,
  bottom,
  onBack,
  onCreate,
}: {
  top: number;
  bottom: number;
  onBack: () => void;
  onCreate: () => void;
}) {
  return (
    <View className="flex-1 overflow-hidden bg-black">
      <LinearGradient
        colors={['#06112A', '#0A6CFF', '#020617']}
        locations={[0, 0.48, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View className="absolute -right-20 top-16 h-56 w-56 rounded-full bg-white/10" />
      <View className="absolute -left-24 bottom-24 h-64 w-64 rounded-full bg-black/25" />

      <View className="absolute left-0 right-0 flex-row items-center justify-between px-4" style={{ top: top + 8 }}>
        <Pressable onPress={onBack} hitSlop={10} className="h-10 w-10 items-center justify-center rounded-full bg-black/30 active:opacity-75">
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <View className="rounded-full bg-black/24 px-3.5 py-2">
          <AppText className="font-bold text-sm text-white">Video bozor</AppText>
        </View>
        <View className="h-10 w-10" />
      </View>

      <View className="flex-1 justify-center px-6" style={{ paddingTop: top + 52, paddingBottom: bottom + 28 }}>
        <View className="mb-8 h-72 items-center justify-center">
          {[0, 1, 2].map((item) => (
            <View
              key={item}
              className="absolute overflow-hidden rounded-[28px] border border-white/16"
              style={{
                width: item === 1 ? 150 : 132,
                height: item === 1 ? 246 : 218,
                left: item === 0 ? 18 : undefined,
                right: item === 2 ? 18 : undefined,
                transform: [{ rotate: item === 0 ? '-10deg' : item === 2 ? '10deg' : '0deg' }],
                opacity: item === 1 ? 1 : 0.72,
                shadowColor: '#000',
                shadowOpacity: 0.28,
                shadowRadius: 22,
                shadowOffset: { width: 0, height: 14 },
                elevation: item === 1 ? 9 : 5,
              }}
            >
              <LinearGradient
                colors={
                  item === 0
                    ? ['#0F766E', '#38BDF8', '#082F49']
                    : item === 1
                      ? ['#111827', '#2563EB', '#030712']
                      : ['#7C2D12', '#F97316', '#111827']
                }
                style={StyleSheet.absoluteFill}
              />
              <View className="absolute left-3 top-3 h-8 w-8 items-center justify-center rounded-full bg-white/18">
                <Ionicons name={item === 1 ? 'play' : 'videocam'} size={16} color="#fff" style={{ marginLeft: item === 1 ? 2 : 0 }} />
              </View>
              <View className="absolute bottom-3 left-3 right-3">
                <View className="mb-2 h-2.5 rounded-full bg-white/70" style={{ width: item === 1 ? '78%' : '62%' }} />
                <View className="h-2 rounded-full bg-white/35" style={{ width: item === 1 ? '54%' : '44%' }} />
              </View>
            </View>
          ))}
        </View>

        <View className="items-center">
          <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-white/14">
            <Ionicons name="sparkles" size={26} color="#fff" />
          </View>
          <AppText className="text-center font-bold text-3xl leading-9 text-white">
            Video bozor tayyor
          </AppText>
          <AppText className="mt-3 max-w-[320px] text-center text-base leading-6 text-white/76">
            Birinchi hayvon videosini joylang. Bu yerda xaridorlar hayvonni tirik ko'rib, tezroq ishonch hosil qiladi.
          </AppText>
        </View>

        <View className="mt-8 gap-3">
          <Pressable
            onPress={onCreate}
            className="h-14 flex-row items-center justify-center rounded-2xl bg-white active:opacity-90"
          >
            <Ionicons name="add-circle" size={21} color={BRAND_BLUE} />
            <AppText className="ml-2 font-bold text-base" style={{ color: BRAND_BLUE }}>
              Video qo'shish
            </AppText>
          </Pressable>
          <Pressable
            onPress={onBack}
            className="h-13 flex-row items-center justify-center rounded-2xl border border-white/16 bg-black/18 active:opacity-80"
          >
            <Ionicons name="home-outline" size={19} color="#fff" />
            <AppText className="ml-2 font-semibold text-base text-white">Asosiyga qaytish</AppText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function ReelsLoadingSkeleton({ onBack }: { onBack: () => void }) {
  const { top, bottom } = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-black">
      <LinearGradient
        colors={['rgba(15,23,42,0.86)', 'rgba(2,6,23,1)']}
        style={StyleSheet.absoluteFill}
      />
      <View className="absolute left-0 right-0 flex-row items-center justify-between px-4" style={{ top: top + 8 }}>
        <Pressable onPress={onBack} hitSlop={10} className="h-10 w-10 items-center justify-center rounded-full bg-white/12">
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <View className="h-9 w-32 rounded-full bg-white/12" />
        <View className="h-10 w-10 rounded-full bg-white/10" />
      </View>
      <View className="absolute right-4 gap-4" style={{ bottom: bottom + 152 }}>
        {[0, 1, 2, 3].map((item) => (
          <View key={item} className="items-center">
            <View className="h-10 w-10 rounded-full bg-white/12" />
            <View className="mt-2 h-2 w-5 rounded-full bg-white/10" />
          </View>
        ))}
      </View>
      <View className="absolute left-4 right-20" style={{ bottom: bottom + 24 }}>
        <View className="mb-3 flex-row items-center">
          <View className="h-11 w-11 rounded-full bg-white/16" />
          <View className="ml-3 flex-1">
            <View className="h-4 w-36 rounded-full bg-white/16" />
            <View className="mt-2 h-3 w-28 rounded-full bg-white/10" />
          </View>
        </View>
        <View className="h-16 rounded-[22px] border border-white/10 bg-white/10" />
        <View className="mt-4 flex-row gap-2">
          <View className="h-12 flex-1 rounded-xl bg-white/16" />
          <View className="h-12 flex-1 rounded-xl bg-white/12" />
        </View>
      </View>
    </View>
  );
}

function VideoWarmup({ url }: { url?: string | null }) {
  const warmupUrl = Platform.OS === 'web' && url?.includes('.m3u8') ? null : url;
  const player = useVideoPlayer(warmupUrl ? cacheableSource(warmupUrl) : '', (p) => {
    (p as unknown as { muted?: boolean }).muted = true;
    p.loop = false;
  });

  useEffect(() => {
    if (!warmupUrl) return;
    safeVideoCall(() => player.pause());
  }, [player, warmupUrl]);

  return null;
}

function CloudflareStreamFrame({
  uid,
  playing,
}: {
  uid: string;
  playing: boolean;
}) {
  if (Platform.OS !== 'web') return null;
  return React.createElement('iframe', {
    src: playing ? cloudflareFrameUrl(uid, true) : undefined,
    allow: 'accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;',
    allowFullScreen: true,
    frameBorder: 0,
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      border: 0,
      pointerEvents: 'none',
      backgroundColor: '#000',
    },
  });
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
  const [videoLoading, setVideoLoading] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const viewRecorded = useRef(false);
  const watchStartedAt = useRef<number | null>(null);
  const lastTapAt = useRef(0);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const useCloudflareFrame = shouldUseCloudflareFrame(reel);

  const player = useVideoPlayer(near && !useCloudflareFrame ? cacheableSource(reel.videoUrl) : '', (p) => {
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
  const hideReel = useMutation(api.reels.hideForUser);

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
        const durationMs = reel.duration ? reel.duration * 1000 : undefined;
        const replayed = !!durationMs && ms > durationMs * 1.15;
        if (ms > 800) recordWatch({ reelId: reel._id, ms, durationMs, replayed }).catch(() => {});
      }
    }
    return () => {
      safeVideoCall(() => player.pause());
    };
  }, [active, manualPaused, player, recordView, recordWatch, reel._id, reel.duration]);

  useEffect(() => {
    if (!active || manualPaused || !reel.videoUrl) {
      setVideoLoading(false);
      return;
    }
    setVideoLoading(true);
    const timeout = setTimeout(() => setVideoLoading(false), 850);
    return () => clearTimeout(timeout);
  }, [active, manualPaused, reel.videoUrl]);

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
    if (!reel.sellerId && !reel.listingId) {
      Alert.alert('Xatolik', 'Sotuvchi topilmadi.');
      return;
    }
    if (reel.sellerId === userId) {
      Alert.alert('Bu sizning videoingiz', 'O`zingizga chat yozib bo`lmaydi.');
      return;
    }
    try {
      const threadId = await openThread({
        meId: userId!,
        listingId: reel.listingId ?? undefined,
        sellerId: reel.sellerId ?? undefined,
      });
      router.push({
        pathname: '/chat/[id]',
        params: {
          id: threadId,
          name: reel.sellerName ?? 'Sotuvchi',
          sellerId: reel.sellerId ?? '',
          reelId: reel._id,
          prefill: `Assalomu alaykum, Video bozor dagi "${reel.title}" haqida yozayapman.`,
        },
      });
    } catch {
      Alert.alert('Xatolik', 'Suhbatni ochib bo`lmadi.');
    }
  };

  const onCall = () => {
    recordTap({ reelId: reel._id, kind: 'call' }).catch(() => {});
    if (reel.sellerPhone) Linking.openURL(`tel:${reel.sellerPhone}`).catch(() => {});
  };

  const submitReport = (reason: string) => {
    setSafetyOpen(false);
    const scope = reason.toLowerCase().includes('firib') ? 'seller' : 'reel';
    createReport({
      listingTitle: reel.title,
      reason,
      reporter: userName,
      sellerId: reel.sellerId ?? undefined,
    })
      .then(async () => {
        if (userId) {
          await hideReel({
            userId,
            reelId: reel._id,
            sellerId: reel.sellerId ?? undefined,
            scope,
            reason,
          });
        }
        Alert.alert('Yuborildi', userId ? 'Shikoyat yuborildi va video lentadan yashirildi.' : 'Shikoyat adminlarga yuborildi. Rahmat!');
      })
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
        {useCloudflareFrame && reel.providerVideoId ? (
          <CloudflareStreamFrame uid={reel.providerVideoId} playing={active && !manualPaused} />
        ) : (
          <VideoView
            player={player}
            style={{ position: 'absolute', width: '100%', height: '100%' }}
            contentFit="cover"
            nativeControls={false}
          />
        )}
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
        {videoLoading ? (
          <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
            <View className="items-center rounded-3xl border border-white/10 bg-black/45 px-5 py-4">
              <ActivityIndicator color="#fff" />
              <AppText className="mt-2 text-xs font-semibold text-white/80">Yuklanmoqda</AppText>
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

        <View className="mb-2 flex-row flex-wrap gap-1.5">
          {reel.sellerVerified || reel.sellerIsDealer ? <TrustBadge icon="checkmark-circle" label="Ishonchli" /> : null}
          {reel.sellerPhoneVerified ? <TrustBadge icon="call" label="Telefon tasdiq" /> : null}
          {reel.sellerNoReports ? <TrustBadge icon="shield-checkmark" label="Toza sotuvchi" /> : null}
        </View>

        <Pressable
          onPress={() => setDetailsOpen(true)}
          className="overflow-hidden rounded-[22px] border active:opacity-85"
          style={{
            borderColor: 'rgba(96,165,250,0.42)',
            backgroundColor: 'rgba(29,78,216,0.30)',
          }}
        >
          <BlurView intensity={26} tint="dark" className="px-3.5 py-3">
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(59,130,246,0.40)', 'rgba(30,64,175,0.20)', 'rgba(15,23,42,0.10)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View className="flex-row items-center">
              <View
                className="mr-3 h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: 'rgba(147,197,253,0.22)' }}
              >
                <Ionicons name="information-circle-outline" size={21} color="#DBEAFE" />
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
              <Ionicons name="chevron-up" size={18} color="rgba(219,234,254,0.86)" />
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

function TrustBadge({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View className="flex-row items-center rounded-full border border-white/12 bg-black/34 px-2.5 py-1">
      <Ionicons name={icon} size={12} color="#BFDBFE" />
      <AppText className="ml-1 text-[11px] font-bold text-white/88">{label}</AppText>
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
      <View className="flex-1 justify-end bg-black/45">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="px-3 pb-3" style={{ paddingBottom: bottom + 10 }}>
          <View
            className="overflow-hidden rounded-[34px] border border-white/10"
            style={{
              backgroundColor: 'rgba(5, 8, 14, 0.84)',
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
                  'rgba(29,78,216,0.22)',
                  'rgba(255,255,255,0.05)',
                  'rgba(0,0,0,0.26)',
                ]}
                locations={[0, 0.36, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.92, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View className="absolute left-8 top-0 h-px w-40" style={{ backgroundColor: 'rgba(59,130,246,0.55)' }} />

              <View className="items-center pt-2.5">
                <View className="h-1.5 w-11 rounded-full bg-white/40" />
              </View>

              <View className="px-5 pb-5 pt-4">
                <View className="mb-4 flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <AppText className="text-xs font-semibold uppercase text-white/50">
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
                    className="h-10 w-10 items-center justify-center rounded-full border active:opacity-75"
                    style={{ borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'rgba(15,23,42,0.74)' }}
                  >
                    <Ionicons name="close" size={22} color="#fff" />
                  </Pressable>
                </View>

                <View className="mb-4 flex-row flex-wrap gap-2">
                  {chips.slice(0, 4).map((chip, index) => (
                    <View
                      key={`${chip}-${index}`}
                      className="rounded-full border px-3 py-1.5"
                      style={{
                        borderColor: index === 0 ? 'rgba(59,130,246,0.42)' : 'rgba(255,255,255,0.12)',
                        backgroundColor: index === 0 ? 'rgba(29,78,216,0.34)' : 'rgba(15,23,42,0.62)',
                      }}
                    >
                      <AppText className="text-xs font-semibold text-white/90">{chip}</AppText>
                    </View>
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
                        className="min-h-[78px] rounded-[22px] border px-3 py-3"
                        style={{
                          width: '48%',
                          borderColor: 'rgba(255,255,255,0.10)',
                          backgroundColor: 'rgba(15,23,42,0.58)',
                        }}
                      >
                        <View className="mb-2 flex-row items-center">
                          <View className="mr-2 h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(59,130,246,0.22)' }}>
                            <Ionicons name={row.icon} size={15} color="rgba(191,219,254,0.96)" />
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
                    <View className="mt-3 rounded-[24px] border p-4" style={{ borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(2,6,23,0.46)' }}>
                      <View className="mb-2 flex-row items-center">
                        <Ionicons name="reader-outline" size={16} color="rgba(255,255,255,0.72)" />
                        <AppText className="ml-2 text-xs font-semibold uppercase text-white/58">
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
                    className="h-13 flex-1 flex-row items-center justify-center rounded-2xl border active:opacity-90 disabled:opacity-50"
                    style={{ borderColor: 'rgba(59,130,246,0.38)', backgroundColor: 'rgba(37,99,235,0.34)' }}
                  >
                    <Ionicons name="open-outline" size={18} color="#DBEAFE" />
                    <AppText className="ml-2 font-bold text-base text-white">
                      E'lonni ochish
                    </AppText>
                  </Pressable>
                  <Pressable
                    onPress={onClose}
                    className="h-13 w-14 items-center justify-center rounded-2xl border active:opacity-80"
                    style={{ borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(15,23,42,0.62)' }}
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
