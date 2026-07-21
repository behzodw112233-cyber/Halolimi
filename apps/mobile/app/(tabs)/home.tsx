import { api } from '@halolmia/backend/convex/_generated/api';
import type { Id } from '@halolmia/backend/convex/_generated/dataModel';
import { Ionicons } from '@expo/vector-icons';
import { useAction, useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, FlatList, Linking, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/app-text';
import { ListingCard } from '../../components/listing-card';
import { Logo } from '../../components/logo';
import { CATEGORY_IMAGES } from '../../constants/category-images';
import { PROMOS, PROMO_IMAGES } from '../../constants/promos';
import { BRAND_BLUE } from '../../constants/theme';
import { useAuth } from '../../lib/auth';
import { useNotifications } from '../../lib/notifications';
import {
  AudioModule,
  RecordingPresets,
  hasExpoAudio,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  useVideoPlayer,
  VideoView,
} from '../../lib/optional-native';
import { capture, useExperiment } from '../../lib/posthog';
import { useRecentlyViewed } from '../../lib/recently-viewed';
import { runtime } from '../../lib/runtime';
import { useSaved } from '../../lib/saved';

/** Each "Tezroq toping" promo → the search filter it opens. */
const PROMO_FILTERS: Record<string, Record<string, string>> = {
  qurbonlik: { category: 'sheep' }, // qurbonlik hayvonlari = qoʻy/echki
  naslli: { category: 'cattle' }, // naslli mollar = zotli qoramol
  arzon: { priceMax: '5000000' }, // arzon = 5 mln soʻmgacha
  yaqin: { nearby: '1' }, // yaqin atrofda → GPS-based nearby search
};

/** One official-dealer showcase, resolved by api.dealers.list. */
type DealerAdData = {
  _id: string;
  title: string;
  dealer?: string | null;
  videoUrl?: string | null;
  thumbUrl?: string | null;
  sellerId?: string | null;
  sellerName?: string | null;
  avatarUrl?: string | null;
};

type ReelPreview = {
  _id: string;
  title: string;
  price?: string;
  city?: string;
  videoUrl?: string | null;
  thumbUrl?: string | null;
  sellerName?: string | null;
};

type AiAdvice = {
  summary: string;
  advice: string;
  budgetMax?: number;
  categories?: string[];
  goal?: string;
  timelineMonths?: number;
  keywords?: string[];
  confidence?: number;
  chips?: string[];
  followUps?: string[];
  estimate?: { title?: string; items?: { label: string; value: string }[] };
  provider?: string;
};

type SavedAiSearch = { text: string; summary?: string; savedAt: number };

const AI_SEARCHES_KEY = 'halolmi_ai_searches';
const LAST_AI_SEARCH_KEY = 'halolmi_last_ai_search';
const HOME_VARIANTS = ['kabinet_glass', 'kabinet_clean'] as const;

async function getStoredValue(key: string) {
  if (Platform.OS === 'web') {
    return (globalThis as { localStorage?: Storage }).localStorage?.getItem(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

async function setStoredValue(key: string, value: string) {
  if (Platform.OS === 'web') {
    (globalThis as { localStorage?: Storage }).localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function readSavedAiSearches() {
  const raw = await getStoredValue(AI_SEARCHES_KEY);
  if (!raw) return [] as SavedAiSearch[];
  try {
    const parsed = JSON.parse(raw) as SavedAiSearch[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function thumbnailCandidates(url?: string | null) {
  if (!url) return [];
  if (url.includes('/thumbnails/thumbnail.jpg') && !url.includes('?')) {
    return [url, `${url}?time=1s&height=360`, `${url}?time=2s&height=360`];
  }
  return [url];
}

function safePreviewCall(fn: () => void) {
  try {
    fn();
  } catch {
    // Preview players can be released while the feed recycles cells.
  }
}

function VideoBozorPreview({
  reel,
  onPress,
}: {
  reel: ReelPreview | null;
  onPress: () => void;
}) {
  const candidates = useMemo(() => thumbnailCandidates(reel?.thumbUrl), [reel?.thumbUrl]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const imageUrl = candidates[candidateIndex];
  const showVideoFallback = !!reel?.videoUrl && !imageUrl;
  const player = useVideoPlayer(showVideoFallback && reel?.videoUrl ? reel.videoUrl : '', (p) => {
    p.loop = true;
    p.muted = true;
  });

  useEffect(() => {
    setCandidateIndex(0);
  }, [reel?._id, reel?.thumbUrl]);

  useEffect(() => {
    if (!showVideoFallback) {
      safePreviewCall(() => player.pause());
      return;
    }
    safePreviewCall(() => player.play());
    return () => {
      safePreviewCall(() => player.pause());
    };
  }, [player, showVideoFallback]);

  return (
    <Pressable
      onPress={onPress}
      className="flex-1 overflow-hidden rounded-xl bg-white/12 active:opacity-85"
      style={{ aspectRatio: 0.76 }}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          contentFit="cover"
          onError={() => {
            setCandidateIndex((i) => (i + 1 < candidates.length ? i + 1 : candidates.length));
          }}
          style={{ position: 'absolute', width: '100%', height: '100%' }}
        />
      ) : showVideoFallback ? (
        <VideoView
          player={player}
          contentFit="cover"
          nativeControls={false}
          surfaceType="textureView"
          style={{ position: 'absolute', width: '100%', height: '100%' }}
        />
      ) : (
        <View className="h-full w-full items-center justify-center">
          <Ionicons name="videocam" size={26} color="#fff" />
        </View>
      )}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.72)']}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 54 }}
      />
      {reel ? (
        <AppText
          className="absolute bottom-2 left-2 right-2 font-semibold text-[12px] leading-4 text-white"
          numberOfLines={2}
        >
          {reel.price ? `${reel.price} · ` : ''}{reel.title}
        </AppText>
      ) : null}
      <View className="absolute right-2 top-2 h-7 w-7 items-center justify-center rounded-full bg-black/45">
        <Ionicons name="play" size={16} color="#fff" style={{ marginLeft: 2 }} />
      </View>
    </Pressable>
  );
}

function ScreenGlow() {
  return (
    <>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(10,108,255,0.22)', 'rgba(255,255,255,0)', 'rgba(15,23,42,0.08)']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View className="absolute -right-24 -top-20 h-72 w-72 rounded-full bg-white/70" />
      <View className="absolute -left-20 top-44 h-56 w-56 rounded-full" style={{ backgroundColor: BRAND_BLUE + '18' }} />
    </>
  );
}

const homeStyles = StyleSheet.create({
  headerCard: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  cleanCard: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  glassPanel: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.09,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  softCard: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  categoryTile: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderColor: 'rgba(226,232,240,0.72)',
    shadowColor: '#0F172A',
    shadowOpacity: 0.025,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
});

function VideoBozorMedia({ reel }: { reel: ReelPreview | null }) {
  const candidates = useMemo(() => thumbnailCandidates(reel?.thumbUrl), [reel?.thumbUrl]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const imageUrl = candidates[candidateIndex];
  const showVideoFallback = !!reel?.videoUrl && !imageUrl;
  const player = useVideoPlayer(showVideoFallback && reel?.videoUrl ? reel.videoUrl : '', (p) => {
    p.loop = true;
    p.muted = true;
  });

  useEffect(() => {
    setCandidateIndex(0);
  }, [reel?._id, reel?.thumbUrl]);

  useEffect(() => {
    if (!showVideoFallback) {
      safePreviewCall(() => player.pause());
      return;
    }
    safePreviewCall(() => player.play());
    return () => {
      safePreviewCall(() => player.pause());
    };
  }, [player, showVideoFallback]);

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        contentFit="cover"
        onError={() => {
          setCandidateIndex((i) => (i + 1 < candidates.length ? i + 1 : candidates.length));
        }}
        style={{ position: 'absolute', width: '100%', height: '100%' }}
      />
    );
  }

  if (showVideoFallback) {
    return (
      <VideoView
        player={player}
        contentFit="cover"
        nativeControls={false}
        surfaceType="textureView"
        style={{ position: 'absolute', width: '100%', height: '100%' }}
      />
    );
  }

  return (
    <View className="h-full w-full items-center justify-center">
      <Ionicons name="videocam" size={26} color="#fff" />
    </View>
  );
}

function VideoBozorCard({ reels }: { reels: ReelPreview[] }) {
  const router = useRouter();
  const previews = reels.slice(0, 3);
  const open = (start?: string) =>
    router.push(start ? ({ pathname: '/reels', params: { start } } as never) : ('/reels' as never));

  return (
    <Pressable onPress={() => open()} className="mx-4 mt-5 overflow-hidden rounded-2xl bg-black active:opacity-95">
      <LinearGradient
        colors={['#111827', '#0A6CFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 14 }}
      >
        <View className="mb-3 flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <View className="flex-row items-center">
              <Ionicons name="play-circle" size={22} color="#fff" />
              <AppText className="ml-2 font-bold text-lg text-white">Video bozor</AppText>
            </View>
            <AppText className="mt-0.5 text-sm leading-5 text-white/75">
              {"Hayvonlarni video orqali ko'ring"}
            </AppText>
          </View>
          <View className="rounded-full bg-white px-3 py-1.5">
            <AppText className="font-bold text-sm" style={{ color: BRAND_BLUE }}>
              {"Ko'rish"}
            </AppText>
          </View>
        </View>

        <View className="flex-row gap-2">
          {(previews.length ? previews : [null, null, null]).map((reel, index) => (
            <Pressable
              key={reel?._id ?? index}
              onPress={() => reel?._id && open(reel._id)}
              className="flex-1 overflow-hidden rounded-xl bg-white/12 active:opacity-85"
              style={{ aspectRatio: 0.76 }}
            >
              <VideoBozorMedia reel={reel} />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.72)']}
                style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 54 }}
              />
              {reel ? (
                <AppText
                  className="absolute bottom-2 left-2 right-2 font-semibold text-[12px] leading-4 text-white"
                  numberOfLines={2}
                >
                  {reel.price ? `${reel.price} · ` : ''}{reel.title}
                </AppText>
              ) : null}
              <View className="absolute right-2 top-2 h-7 w-7 items-center justify-center rounded-full bg-black/45">
                <Ionicons name="play" size={16} color="#fff" style={{ marginLeft: 2 }} />
              </View>
            </Pressable>
          ))}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

/**
 * A sponsored, Instagram-style dealer post rendered inline in the feed. Tapping
 * the media (or "Videoni koʻrish") plays the video full-screen; "Profil" opens
 * the linked seller.
 */
function DealerAd({ d }: { d: DealerAdData }) {
  const router = useRouter();
  const name = d.sellerName ?? d.dealer ?? 'Rasmiy diler';
  const openVideo = () =>
    router.push({
      pathname: '/dealer/[id]',
      params: { id: d._id, video: d.videoUrl ?? '', title: d.title, dealer: name },
    } as unknown as Href);

  return (
    <View className="mx-4 mb-3 overflow-hidden rounded-[26px] border border-white/70" style={homeStyles.glassPanel}>
      <BlurView intensity={32} tint="light" style={StyleSheet.absoluteFill} />
      {/* Sponsored header — seller identity */}
      <View className="flex-row items-center px-3 py-2.5">
        {d.avatarUrl ? (
          <Image source={{ uri: d.avatarUrl }} style={{ width: 38, height: 38, borderRadius: 19 }} />
        ) : (
          <View
            className="items-center justify-center rounded-full"
            style={{ width: 38, height: 38, backgroundColor: BRAND_BLUE + '18' }}
          >
            <Ionicons name="storefront" size={19} color={BRAND_BLUE} />
          </View>
        )}
        <View className="ml-2.5 flex-1">
          <View className="flex-row items-center">
            <AppText className="font-semibold text-[15px] text-foreground" numberOfLines={1}>
              {name}
            </AppText>
            <Ionicons name="checkmark-circle" size={15} color={BRAND_BLUE} style={{ marginLeft: 4 }} />
          </View>
          <AppText className="text-xs text-muted">Homiylik · Rasmiy diler</AppText>
        </View>
      </View>

      {/* Media — video poster with play overlay */}
      <Pressable onPress={openVideo} className="active:opacity-95">
        <View className="bg-black" style={{ width: '100%', aspectRatio: 16 / 10 }}>
          {d.thumbUrl ? (
            <Image
              source={{ uri: d.thumbUrl }}
              contentFit="cover"
              style={{ position: 'absolute', width: '100%', height: '100%' }}
            />
          ) : null}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.55)']}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 72 }}
          />
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} className="items-center justify-center">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-black/45">
              <Ionicons name="play" size={28} color="#fff" style={{ marginLeft: 3 }} />
            </View>
          </View>
          <AppText
            className="absolute bottom-2.5 left-3 right-3 font-semibold text-[15px] leading-5 text-white"
            numberOfLines={2}
          >
            {d.title}
          </AppText>
        </View>
      </Pressable>

      {/* CTA row */}
      <View className="flex-row items-center px-3 py-2.5">
        <Pressable onPress={openVideo} className="flex-row items-center active:opacity-70">
          <Ionicons name="play-circle" size={20} color={BRAND_BLUE} />
          <AppText className="ml-1.5 font-medium text-sm text-foreground">Videoni koʻrish</AppText>
        </Pressable>
        <View className="flex-1" />
        {d.sellerId ? (
          <Pressable
            onPress={() => router.push({ pathname: '/seller/[id]', params: { id: d.sellerId as string } })}
            className="rounded-full px-4 py-1.5 active:opacity-80"
            style={{ backgroundColor: BRAND_BLUE }}
          >
            <AppText className="font-semibold text-sm text-white">Profil</AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default function Home() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { userId } = useAuth();
  const homeVariant = useExperiment('home_section', HOME_VARIANTS, userId);
  const isGlassHome = homeVariant === 'kabinet_glass';
  const openThread = useMutation(api.messages.openThread);
  const askAi = useAction(api.aiAdvisor.ask);
  const transcribeVoice = useAction(api.aiAdvisor.transcribe);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 200);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiAdvice, setAiAdvice] = useState<AiAdvice | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [savedAiSearches, setSavedAiSearches] = useState<SavedAiSearch[]>([]);
  const aiPanelAnim = useRef(new Animated.Value(0)).current;
  const aiResultAnim = useRef(new Animated.Value(0)).current;

  // Quick "ask the price" from a card → open (or reuse) the chat with the seller.
  const askPrice = async (l: { _id: Id<'listings'>; ownerId?: Id<'users'>; sellerName?: string }) => {
    if (!userId) return router.push('/login');
    if (!l.ownerId || l.ownerId === userId) return;
    try {
      const threadId = await openThread({ meId: userId, listingId: l._id });
      router.push({
        pathname: '/chat/[id]',
        params: { id: threadId, name: l.sellerName ?? 'Sotuvchi', sellerId: l.ownerId },
      });
    } catch {
      /* ignore — user can retry from the listing page */
    }
  };
  const [feedNow, setFeedNow] = useState(() => Date.now());
  const [refreshing, setRefreshing] = useState(false);
  const {
    results: listings,
    status: feedStatus,
    loadMore,
  } = usePaginatedQuery(api.listings.listActivePage, { now: feedNow }, { initialNumItems: 12 });
  const ads = useQuery(api.ads.byPlacement, { placement: 'app' }) ?? [];
  const categories = useQuery(api.categories.list) ?? [];
  const dealersQuery = useQuery(api.dealers.list);
  const dealers = useMemo(() => dealersQuery ?? [], [dealersQuery]);
  const reels = useQuery(api.reels.list, userId ? { userId, limit: 8 } : { limit: 8 }) ?? [];
  const aiMatches =
    useQuery(
      api.listings.aiRecommend,
      aiAdvice
        ? {
            categories: aiAdvice.categories,
            budgetMax: aiAdvice.budgetMax,
            q: aiText,
            goal: aiAdvice.goal,
            limit: 8,
            now: feedNow,
          }
        : 'skip'
    ) ?? [];
  const aiBest = aiMatches[0];
  const aiMore = aiMatches.slice(1, 4);
  const aiCompare = aiMatches.slice(0, 3);
  const aiSaved = !!aiText.trim() && savedAiSearches.some((s) => s.text.toLowerCase() === aiText.trim().toLowerCase());
  const homeCategories = categories.slice(0, 5);
  const compactAiComposer = width < 390;
  const { hasUnread } = useNotifications();
  const { isSaved, toggleSave, savedIds } = useSaved();
  const recentIds = useRecentlyViewed();
  const safeRecentIds = useMemo(() => {
    const knownListingIds = new Set<string>([
      ...listings.map((l) => String(l._id)),
      ...savedIds.map((id) => String(id)),
    ]);
    return recentIds.filter((id) => knownListingIds.has(String(id)));
  }, [listings, recentIds, savedIds]);
  const hasRecommendationSignals = safeRecentIds.length > 0 || savedIds.length > 0;
  const recommendations =
    useQuery(
      api.listings.recommendations,
      hasRecommendationSignals
        ? {
            recentIds: safeRecentIds as Id<'listings'>[],
            savedIds,
            limit: 8,
            now: feedNow,
          }
        : 'skip'
    ) ?? [];

  const loadMoreListings = () => {
    if (feedStatus === 'CanLoadMore') loadMore(12);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setFeedNow(Date.now());
    setTimeout(() => setRefreshing(false), 650);
  }, []);

  const runAiSearch = async (textArg = aiText) => {
    const text = textArg.trim();
    if (!text || aiLoading) {
      setAiOpen(true);
      return;
    }
    capture('home_ai_search_submit', { home_variant: homeVariant, text_length: text.length }, userId);
    setAiOpen(true);
    setAiLoading(true);
    try {
      const result = (await askAi({ text })) as AiAdvice;
      setAiAdvice(result);
      setStoredValue(
        LAST_AI_SEARCH_KEY,
        JSON.stringify({ text, advice: result, savedAt: Date.now() })
      ).catch(() => {});
      setFeedNow(Date.now());
    } catch {
      Alert.alert('AI qidiruv', "Hozircha javob kelmadi. Qayta urinib ko'ring.");
    } finally {
      setAiLoading(false);
    }
  };

  const startVoice = async () => {
    if (voiceLoading || recorderState.isRecording) return;
    if (!hasExpoAudio) {
      Alert.alert('Audio moduli kerak', "Ovozli qidiruv uchun ilovani qayta build qilib o'rnating.");
      return;
    }
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Ruxsat kerak', 'Ovozli qidiruv uchun mikrofonga ruxsat bering.');
      return;
    }
    setAiOpen(true);
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const stopVoice = async () => {
    if (!recorderState.isRecording || voiceLoading) return;
    const durationSec = recorder.currentTime;
    await recorder.stop();
    const uri = recorder.uri;
    if (!uri || durationSec < 1) return;
    setVoiceLoading(true);
    try {
      const audioBase64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const { text } = (await transcribeVoice({
        audioBase64,
        mimeType: 'audio/m4a',
      })) as { text: string };
      const next = text.trim();
      if (next) {
        setAiText(next);
        await runAiSearch(next);
      }
    } catch {
      Alert.alert('Ovozli qidiruv', "Ovoz matnga aylantirilmadi. Yozib ko'ring.");
    } finally {
      setVoiceLoading(false);
    }
  };

  const resetAi = () => {
    setAiText('');
    setAiAdvice(null);
    setAiOpen(false);
  };

  const saveAiSearch = async () => {
    const text = aiText.trim();
    if (!text || !aiAdvice) return;
    const next = [
      { text, summary: aiAdvice.summary, savedAt: Date.now() },
      ...savedAiSearches.filter((s) => s.text.toLowerCase() !== text.toLowerCase()),
    ].slice(0, 8);
    setSavedAiSearches(next);
    await setStoredValue(AI_SEARCHES_KEY, JSON.stringify(next));
  };

  const addFollowUp = (value: string) => {
    const next = `${aiText.trim()} ${value}`.trim();
    setAiText(next);
    runAiSearch(next);
  };

  useEffect(() => {
    readSavedAiSearches().then(setSavedAiSearches).catch(() => {});
  }, []);

  useEffect(() => {
    Animated.timing(aiPanelAnim, {
      toValue: aiOpen ? 1 : 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [aiOpen, aiPanelAnim]);

  useEffect(() => {
    Animated.timing(aiResultAnim, {
      toValue: aiAdvice ? 1 : 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [aiAdvice, aiResultAnim]);

  // Interleave dealer showcases into the feed as sponsored posts: one dealer ad
  // after every 4 listings, cycling through the active dealers.
  type FeedRow =
    | { kind: 'listing'; listing: (typeof listings)[number] }
    | { kind: 'dealer'; dealer: (typeof dealers)[number]; k: string };
  const feedData = useMemo<FeedRow[]>(() => {
    const rows: FeedRow[] = [];
    let di = 0;
    listings.forEach((l, i) => {
      rows.push({ kind: 'listing', listing: l });
      if (dealers.length && (i + 1) % 4 === 0) {
        const d = dealers[di % dealers.length];
        rows.push({ kind: 'dealer', dealer: d, k: `d_${d._id}_${i}` });
        di++;
      }
    });
    return rows;
  }, [listings, dealers]);

  const [safetyOpen, setSafetyOpen] = useState(false);

  return (
    <View className="flex-1" style={{ backgroundColor: isGlassHome ? '#EEF4FA' : '#F8FAFC' }}>
      {isGlassHome ? <ScreenGlow /> : null}
      <SafeAreaView edges={['top']} className="flex-1">
        <FlatList
          data={feedData}
          keyExtractor={(row) => (row.kind === 'listing' ? row.listing._id : row.k)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          bounces
          alwaysBounceVertical
          onEndReached={loadMoreListings}
          onEndReachedThreshold={0.7}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={BRAND_BLUE}
              colors={[BRAND_BLUE]}
              progressBackgroundColor="#fff"
              progressViewOffset={8}
            />
          }
          // Smoother scrolling: detach off-screen rows and render in smaller batches.
          removeClippedSubviews
          initialNumToRender={6}
          maxToRenderPerBatch={5}
          updateCellsBatchingPeriod={40}
          windowSize={9}
          ListHeaderComponent={
            <>
              <View
                className="mx-4 mb-3 flex-row items-center justify-between overflow-hidden rounded-[28px] border border-white/70 bg-white/65 px-4 py-3"
                style={isGlassHome ? homeStyles.headerCard : homeStyles.cleanCard}
              >
                {isGlassHome ? <BlurView intensity={34} tint="light" style={StyleSheet.absoluteFill} /> : null}
                <Logo className="text-[#0F172A]" size={22} />
                <Pressable
                  hitSlop={8}
                  onPress={() => {
                    capture('home_notification_tap', { home_variant: homeVariant }, userId);
                    router.push('/notifications');
                  }}
                  className="h-11 w-11 items-center justify-center rounded-full bg-white/70"
                >
                  <Ionicons name="notifications-outline" size={26} color="#0F172A" />
                  {hasUnread && (
                    <View
                      style={{
                        position: 'absolute',
                        top: -1,
                        right: -1,
                        width: 11,
                        height: 11,
                        borderRadius: 6,
                        backgroundColor: '#EF4444',
                        borderWidth: 1.5,
                        borderColor: '#fff',
                      }}
                    />
                  )}
                </Pressable>
              </View>

              <View className="mx-4 mb-4 overflow-hidden rounded-[26px]">
                <LinearGradient
                  colors={['rgba(10,108,255,0.18)', 'rgba(255,255,255,0.88)', 'rgba(232,240,255,0.92)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ padding: 1.2, borderRadius: 26 }}
                >
                  <View className="overflow-hidden rounded-[25px] bg-white/80">
                    <BlurView intensity={38} tint="light" style={{ position: 'absolute', inset: 0 }} />
                    <LinearGradient
                      colors={['rgba(255,255,255,0.92)', 'rgba(246,249,255,0.78)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ position: 'absolute', inset: 0 }}
                    />
                    <View className="flex-row items-start px-3 py-3">
                      <LinearGradient
                        colors={['#EAF2FF', '#FFFFFF']}
                        style={{
                          width: compactAiComposer ? 34 : 38,
                          height: compactAiComposer ? 34 : 38,
                          borderRadius: compactAiComposer ? 17 : 19,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginTop: 1,
                        }}
                      >
                        <Ionicons name="sparkles" size={compactAiComposer ? 16 : 18} color={BRAND_BLUE} />
                      </LinearGradient>
                      <View className="flex-1" style={{ minWidth: 0, marginLeft: compactAiComposer ? 9 : 12 }}>
                        <TextInput
                          value={aiText}
                          onChangeText={setAiText}
                          onFocus={() => setAiOpen(true)}
                          onSubmitEditing={() => runAiSearch()}
                          returnKeyType="search"
                          placeholder="Vaziyatingizni yozing..."
                          placeholderTextColor="#94A3B8"
                          className="min-h-9 py-1 text-[15px] text-foreground"
                          style={{
                            fontFamily: 'Inter-SemiBold',
                            lineHeight: 21,
                            maxHeight: aiOpen ? 78 : 40,
                            paddingRight: 4,
                            textAlignVertical: 'top',
                          }}
                          multiline={aiOpen}
                        />
                      </View>
                      <View
                        className="flex-row items-center rounded-full px-1 py-1"
                        style={{
                          marginLeft: compactAiComposer ? 6 : 8,
                          backgroundColor: 'rgba(255,255,255,0.58)',
                          borderWidth: 1,
                          borderColor: 'rgba(255,255,255,0.85)',
                        }}
                      >
                        {aiText || aiAdvice ? (
                          <Pressable
                            onPress={resetAi}
                            hitSlop={8}
                            className="items-center justify-center rounded-full active:opacity-75"
                            style={{
                              width: compactAiComposer ? 30 : 32,
                              height: compactAiComposer ? 30 : 32,
                            }}
                          >
                            <Ionicons name="close" size={16} color="#64748B" />
                          </Pressable>
                        ) : null}
                        <Pressable
                          onPress={recorderState.isRecording ? stopVoice : startVoice}
                          disabled={voiceLoading || aiLoading}
                          hitSlop={8}
                          className="items-center justify-center rounded-full active:opacity-75"
                          style={{
                            width: compactAiComposer ? 30 : 32,
                            height: compactAiComposer ? 30 : 32,
                            backgroundColor: recorderState.isRecording ? '#EF4444' : 'rgba(10,108,255,0.10)',
                          }}
                        >
                          <Ionicons
                            name={voiceLoading ? 'hourglass-outline' : recorderState.isRecording ? 'stop' : 'mic-outline'}
                            size={17}
                            color={recorderState.isRecording ? '#fff' : BRAND_BLUE}
                          />
                        </Pressable>
                        <Pressable
                          onPress={() => runAiSearch()}
                          disabled={aiLoading || !aiText.trim()}
                          className="ml-1 items-center justify-center rounded-full active:opacity-80"
                          style={{
                            width: compactAiComposer ? 30 : 32,
                            height: compactAiComposer ? 30 : 32,
                            backgroundColor: aiText.trim() ? BRAND_BLUE : 'rgba(148,163,184,0.18)',
                            shadowColor: BRAND_BLUE,
                            shadowOpacity: aiText.trim() ? 0.2 : 0,
                            shadowRadius: 7,
                            shadowOffset: { width: 0, height: 3 },
                          }}
                        >
                          <Ionicons
                            name={aiLoading ? 'hourglass-outline' : 'arrow-up'}
                            size={16}
                            color={aiText.trim() ? '#fff' : '#94A3B8'}
                          />
                        </Pressable>
                      </View>
                    </View>

                    {aiOpen ? (
                      <Animated.View
                        style={{
                          opacity: aiPanelAnim,
                          transform: [
                            {
                              translateY: aiPanelAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [-8, 0],
                              }),
                            },
                            {
                              scale: aiPanelAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.985, 1],
                              }),
                            },
                          ],
                        }}
                        className="px-3 pb-3"
                      >
                        <View className="h-px bg-white/70" />
                        {recorderState.isRecording ? (
                          <View className="mt-3 flex-row items-center rounded-2xl bg-red-50/90 px-3 py-2.5">
                            <View className="mr-2 h-2.5 w-2.5 rounded-full bg-red-500" />
                            <AppText className="flex-1 text-sm font-semibold text-red-600">
                              Gapiring, tugatgach qizil tugmani bosing
                            </AppText>
                          </View>
                        ) : null}
                        {aiAdvice ? (
                          <LinearGradient
                            colors={['rgba(10,108,255,0.12)', 'rgba(255,255,255,0.72)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{ borderRadius: 20, padding: 13, marginTop: 12 }}
                          >
                            <View className="mb-1.5 flex-row items-center">
                              <View className="h-7 w-7 items-center justify-center rounded-full bg-white">
                                <Ionicons name="sparkles" size={15} color={BRAND_BLUE} />
                              </View>
                              <AppText className="ml-2 font-bold text-sm text-foreground">AI maslahati</AppText>
                            </View>
                            <AppText className="text-[14px] leading-5 text-foreground">{aiAdvice.advice}</AppText>
                            {!!aiAdvice.chips?.length && (
                              <View className="mt-3 flex-row flex-wrap gap-1.5">
                                {aiAdvice.chips.slice(0, 4).map((chip) => (
                                  <View key={chip} className="rounded-full bg-white/90 px-2.5 py-1.5">
                                    <AppText className="text-[12px] font-bold" style={{ color: BRAND_BLUE }}>
                                      {chip}
                                    </AppText>
                                  </View>
                                ))}
                              </View>
                            )}
                            {!!aiAdvice.estimate?.items?.length && (
                              <View className="mt-3 flex-row gap-2">
                                {aiAdvice.estimate.items.slice(0, 3).map((item) => (
                                  <View key={item.label} className="flex-1 rounded-2xl bg-white/70 px-2.5 py-2">
                                    <AppText className="text-[11px] font-semibold text-muted" numberOfLines={1}>
                                      {item.label}
                                    </AppText>
                                    <AppText className="mt-0.5 text-[12px] font-bold text-foreground" numberOfLines={2}>
                                      {item.value}
                                    </AppText>
                                  </View>
                                ))}
                              </View>
                            )}
                            {!!aiAdvice.followUps?.length && (
                              <View className="mt-3">
                                <AppText className="mb-1.5 text-[12px] font-bold text-muted">Aniqroq qilish</AppText>
                                <View className="flex-row flex-wrap gap-1.5">
                                  {aiAdvice.followUps.slice(0, 3).map((question) => (
                                    <Pressable
                                      key={question}
                                      onPress={() => addFollowUp(question)}
                                      className="rounded-full bg-white/85 px-2.5 py-1.5 active:opacity-80"
                                    >
                                      <AppText className="text-[12px] font-semibold text-foreground">{question}</AppText>
                                    </Pressable>
                                  ))}
                                </View>
                              </View>
                            )}
                          </LinearGradient>
                        ) : (
                          <View className="mt-3 flex-row flex-wrap gap-2">
                            {[
                              { text: '5 mln bor, boqib sotmoqchiman', icon: 'leaf-outline' },
                              { text: "Yaqin atrofda arzon qo'y", icon: 'location-outline' },
                              { text: 'Naslli buzoq kerak', icon: 'ribbon-outline' },
                            ].map((sample) => (
                              <Pressable
                                key={sample.text}
                                onPress={() => {
                                  setAiText(sample.text);
                                  runAiSearch(sample.text);
                                }}
                                className="flex-row items-center rounded-full bg-white/80 px-3 py-2 active:opacity-80"
                                style={{ maxWidth: compactAiComposer ? '100%' : '48%' }}
                              >
                                <Ionicons name={sample.icon as keyof typeof Ionicons.glyphMap} size={14} color={BRAND_BLUE} />
                                <AppText className="ml-1.5 text-[13px] font-semibold text-foreground" numberOfLines={1}>
                                  {sample.text}
                                </AppText>
                              </Pressable>
                            ))}
                            <Pressable
                              onPress={recorderState.isRecording ? stopVoice : startVoice}
                              className="flex-row items-center rounded-full bg-blue-50/90 px-3 py-2 active:opacity-80"
                              style={{ maxWidth: compactAiComposer ? '100%' : '48%' }}
                            >
                              <Ionicons name="mic-outline" size={14} color={BRAND_BLUE} />
                              <AppText className="ml-1.5 text-[13px] font-bold" style={{ color: BRAND_BLUE }} numberOfLines={1}>
                                Ovoz bilan ayting
                              </AppText>
                            </Pressable>
                            {savedAiSearches.slice(0, 2).map((savedSearch) => (
                              <Pressable
                                key={savedSearch.savedAt}
                                onPress={() => {
                                  setAiText(savedSearch.text);
                                  runAiSearch(savedSearch.text);
                                }}
                                className="flex-row items-center rounded-full bg-white/70 px-3 py-2 active:opacity-80"
                                style={{ maxWidth: compactAiComposer ? '100%' : '48%' }}
                              >
                                <Ionicons name="bookmark" size={14} color="#64748B" />
                                <AppText className="ml-1.5 text-[13px] font-semibold text-foreground" numberOfLines={1}>
                                  {savedSearch.text}
                                </AppText>
                              </Pressable>
                            ))}
                          </View>
                        )}
                      </Animated.View>
                    ) : null}
                  </View>
                </LinearGradient>
              </View>

              {aiAdvice && aiBest ? (
                <Animated.View
                  className="mb-2 px-4"
                  style={{
                    opacity: aiResultAnim,
                    transform: [
                      {
                        translateY: aiResultAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [12, 0],
                        }),
                      },
                    ],
                  }}
                >
                  <View className="mb-2 flex-row items-center justify-between">
                    <View className="flex-1 pr-2">
                      <View className="mb-1 flex-row items-center">
                        <LinearGradient
                          colors={[BRAND_BLUE, '#60A5FA']}
                          style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Ionicons name="sparkles" size={14} color="#fff" />
                        </LinearGradient>
                        <AppText className="ml-2 font-bold text-lg text-foreground">AI tavsiya qildi</AppText>
                      </View>
                      <AppText className="text-sm text-muted" numberOfLines={1}>
                        {aiAdvice.summary}
                      </AppText>
                    </View>
                    <Pressable
                      onPress={saveAiSearch}
                      disabled={aiSaved}
                      className="flex-row items-center rounded-full bg-blue-50 px-3 py-1.5 active:opacity-80"
                    >
                      <Ionicons name={aiSaved ? 'bookmark' : 'bookmark-outline'} size={14} color={BRAND_BLUE} />
                      <AppText className="ml-1 text-[12px] font-bold" style={{ color: BRAND_BLUE }}>
                        {aiSaved ? 'Saqlandi' : 'Saqlash'}
                      </AppText>
                    </Pressable>
                  </View>
                  {!!aiBest.aiReasons?.length && (
                    <View className="mb-2 flex-row flex-wrap gap-1.5">
                      {aiBest.aiReasons.slice(0, 4).map((reason: string) => (
                        <View key={reason} className="flex-row items-center rounded-full bg-white px-2.5 py-1.5">
                          <Ionicons name="checkmark-circle" size={13} color={BRAND_BLUE} />
                          <AppText className="ml-1 text-[12px] font-bold" style={{ color: BRAND_BLUE }}>
                            {reason}
                          </AppText>
                        </View>
                      ))}
                    </View>
                  )}
                  <ListingCard
                    listing={{
                      ...aiBest,
                      promoted: !!aiBest.boostedUntil && aiBest.boostedUntil > feedNow,
                    }}
                    saved={isSaved(aiBest._id)}
                    onToggleSave={() => {
                      if (!toggleSave(aiBest._id)) router.push('/login');
                    }}
                    onMessage={
                      aiBest.ownerId && aiBest.ownerId !== userId
                        ? () => askPrice(aiBest)
                        : undefined
                    }
                    onPress={() => router.push({ pathname: '/listing/[id]', params: { id: aiBest._id } })}
                  />
                </Animated.View>
              ) : aiAdvice && aiLoading ? (
                <View className="mx-4 mb-3 rounded-2xl bg-surface p-4">
                  <AppText className="text-center text-sm font-medium text-muted">AI mos e'lonlarni saralamoqda...</AppText>
                </View>
              ) : null}

              {aiCompare.length >= 2 && (
                <View className="mx-4 mb-4 overflow-hidden rounded-[26px] border border-white/70 bg-white/65 p-3" style={homeStyles.glassPanel}>
                  <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFill} />
                  <View className="mb-2 flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Ionicons name="git-compare-outline" size={17} color={BRAND_BLUE} />
                      <AppText className="ml-1.5 font-bold text-base text-foreground">Tez solishtirish</AppText>
                    </View>
                    <AppText className="text-[12px] font-semibold text-muted">Top 3</AppText>
                  </View>
                  <View className="flex-row gap-2">
                    {aiCompare.map((listing, index) => (
                      <Pressable
                        key={listing._id}
                        onPress={() => {
                          capture('home_ai_more_listing_tap', { home_variant: homeVariant, listing_id: listing._id }, userId);
                          router.push({ pathname: '/listing/[id]', params: { id: listing._id } });
                        }}
                        className="flex-1 rounded-2xl bg-white/70 px-2.5 py-2.5 active:opacity-80"
                      >
                        <View className="mb-1 flex-row items-center">
                          <View className="h-5 w-5 items-center justify-center rounded-full" style={{ backgroundColor: index === 0 ? BRAND_BLUE : '#E5E7EB' }}>
                            <AppText className="text-[11px] font-bold" style={{ color: index === 0 ? '#fff' : '#64748B' }}>
                              {index + 1}
                            </AppText>
                          </View>
                          <AppText className="ml-1 flex-1 text-[11px] font-semibold text-muted" numberOfLines={1}>
                            {listing.city}
                          </AppText>
                        </View>
                        <AppText className="text-[13px] font-bold text-foreground" numberOfLines={1}>
                          {listing.price}
                        </AppText>
                        <AppText className="mt-0.5 text-[12px] text-muted" numberOfLines={2}>
                          {listing.aiReasons?.[0] ?? listing.category}
                        </AppText>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {aiMore.length > 0 && (
                <View className="mb-4">
                  <View className="mb-2 px-4">
                    <AppText className="font-bold text-base text-foreground">Yana mos e'lonlar</AppText>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
                  >
                    {aiMore.map((listing) => (
                      <Pressable
                        key={listing._id}
                        onPress={() => router.push({ pathname: '/listing/[id]', params: { id: listing._id } })}
                        className="overflow-hidden rounded-[22px] border border-white/70 bg-white/70 active:opacity-90"
                        style={[homeStyles.softCard, { width: 188 }]}
                      >
                        <View className="bg-white/65" style={{ height: 118 }}>
                          <Image
                            source={listing.photoUrls?.[0] ? { uri: listing.photoUrls[0] } : CATEGORY_IMAGES[listing.category]}
                            contentFit={listing.photoUrls?.[0] ? 'cover' : 'contain'}
                            style={
                              listing.photoUrls?.[0]
                                ? { width: '100%', height: '100%' }
                                : { width: '84%', height: '84%', alignSelf: 'center', marginTop: 10 }
                            }
                          />
                        </View>
                        <View className="p-3">
                          {!!listing.aiReasons?.length && (
                            <View className="mb-2 flex-row flex-wrap gap-1">
                              {listing.aiReasons.slice(0, 2).map((reason: string) => (
                                <View key={reason} className="rounded-full bg-blue-50 px-2 py-1">
                                  <AppText className="text-[10px] font-bold" style={{ color: BRAND_BLUE }}>
                                    {reason}
                                  </AppText>
                                </View>
                              ))}
                            </View>
                          )}
                          <AppText className="font-bold text-base text-foreground" numberOfLines={1}>
                            {listing.price}
                          </AppText>
                          <AppText className="mt-0.5 text-sm text-foreground" numberOfLines={1}>
                            {listing.title}
                          </AppText>
                          <AppText className="mt-1 text-xs text-muted" numberOfLines={1}>
                            {listing.city}
                          </AppText>
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              <View
                className="mx-4 flex-row flex-wrap justify-between overflow-hidden rounded-[28px] border border-[#E5ECF6] bg-white/75 p-3"
                style={isGlassHome ? homeStyles.glassPanel : homeStyles.cleanCard}
              >
                {isGlassHome ? <BlurView intensity={32} tint="light" style={StyleSheet.absoluteFill} /> : null}
                <Pressable
                  onPress={() => {
                    capture('home_sell_tap', { home_variant: homeVariant }, userId);
                    router.push('/sell');
                  }}
                  style={{ width: '31.5%', height: isGlassHome ? 92 : 84 }}
                  className="mb-2.5 items-center justify-center rounded-[22px] active:opacity-80"
                >
                  <View
                    className="h-full w-full items-center justify-center rounded-[22px]"
                    style={{ backgroundColor: BRAND_BLUE }}
                  >
                    <Ionicons name="add" size={26} color="white" />
                    <AppText className="mt-1 font-semibold text-sm text-white">
                      Sotish
                    </AppText>
                  </View>
                </Pressable>

                {homeCategories.map((c) => (
                  <Pressable
                    key={c._id}
                    onPress={() => {
                      capture('home_category_tap', { home_variant: homeVariant, category: c.slug }, userId);
                      router.push({ pathname: '/search', params: { category: c.slug } } as never);
                    }}
                    style={[homeStyles.categoryTile, { width: '31.5%', height: isGlassHome ? 92 : 84 }]}
                    className="mb-2.5 overflow-hidden rounded-[22px] border active:opacity-80"
                  >
                    <AppText className="px-2.5 pt-2.5 text-xs font-semibold leading-4 text-foreground" numberOfLines={2}>
                      {c.name}
                    </AppText>
                    {CATEGORY_IMAGES[c.slug] && (
                      <Image
                        source={CATEGORY_IMAGES[c.slug]}
                        contentFit="contain"
                        style={{ position: 'absolute', right: 4, bottom: 4, width: '58%', height: '58%' }}
                      />
                    )}
                  </Pressable>
                ))}
              </View>

              <AppText className="mb-3 mt-3 px-4 font-bold text-lg text-foreground">
                Tezroq toping
              </AppText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
              >
                {PROMOS.map((q) => {
                  const image = PROMO_IMAGES[q.id];
                  return (
                    <Pressable
                      key={q.id}
                      className="active:opacity-80"
                      onPress={() => {
                        capture('home_promo_tap', { home_variant: homeVariant, promo_id: q.id }, userId);
                        router.push({ pathname: '/search', params: PROMO_FILTERS[q.id] ?? { q: q.title } });
                      }}
                    >
                      <View
                        className="overflow-hidden"
                        style={{ width: 150, height: 90, borderRadius: 16 }}
                      >
                        {image ? (
                          <Image
                            source={image}
                            contentFit="cover"
                            style={{ position: 'absolute', width: '100%', height: '100%' }}
                          />
                        ) : (
                          <LinearGradient
                            colors={q.gradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{ position: 'absolute', width: '100%', height: '100%' }}
                          />
                        )}
                        <LinearGradient
                          colors={['transparent', 'rgba(0,0,0,0.55)']}
                          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 48 }}
                        />
                        {!image && (
                          <AppText style={{ position: 'absolute', top: 8, left: 12, fontSize: 22 }}>
                            {q.emoji}
                          </AppText>
                        )}
                        <AppText
                          className="absolute bottom-2 left-3 right-3 font-semibold text-[13px] leading-4 text-white"
                          numberOfLines={2}
                        >
                          {q.title}
                        </AppText>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {runtime.supportsReels ? <VideoBozorCard reels={reels as ReelPreview[]} /> : null}

              <View className="mx-4 mt-6 overflow-hidden rounded-[26px] border border-white/70 bg-white/65 px-4 py-3" style={homeStyles.headerCard}>
                <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFill} />
                <AppText className="font-bold text-lg text-foreground">
                  {feedStatus === 'LoadingFirstPage'
                    ? 'Eʼlonlar yuklanmoqda...'
                    : `${listings.length} ta eʼlon yuklandi`}
                </AppText>
                <Pressable
                  onPress={() => router.push('/search' as never)}
                  className="mt-1 flex-row items-center active:opacity-70"
                >
                  <AppText className="font-semibold text-base" style={{ color: BRAND_BLUE }}>
                    {"butun O'zbekiston bo'ylab"}
                  </AppText>
                  <Ionicons name="chevron-down" size={18} color={BRAND_BLUE} />
                </Pressable>
              </View>

              {ads.length > 0 && (
                <Pressable
                  className="mx-4 mt-3 overflow-hidden rounded-2xl active:opacity-90"
                  onPress={() => Linking.openURL(ads[0].url).catch(() => {})}
                >
                  <LinearGradient
                    colors={[ads[0].grad[0], ads[0].grad[1] ?? ads[0].grad[0]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ padding: 16, flexDirection: 'row', alignItems: 'center' }}
                  >
                    <AppText className="text-4xl">{ads[0].emoji}</AppText>
                    <View className="ml-3 flex-1">
                      <View className="mb-0.5 self-start rounded-full bg-black/20 px-2 py-0.5">
                        <AppText className="text-[10px] font-medium uppercase tracking-wide text-white">
                          Reklama · {ads[0].advertiser}
                        </AppText>
                      </View>
                      <AppText className="font-bold text-base text-white">{ads[0].headline}</AppText>
                      <AppText className="text-xs leading-4 text-white/85">{ads[0].body}</AppText>
                    </View>
                  </LinearGradient>
                  <View className="flex-row items-center justify-between bg-black/10 px-4 py-2">
                    <AppText className="text-xs text-white/80">Homiylik asosida</AppText>
                    <View className="rounded-full bg-white px-3 py-1">
                      <AppText className="text-xs font-semibold" style={{ color: ads[0].grad[0] }}>
                        {ads[0].cta}
                      </AppText>
                    </View>
                  </View>
                </Pressable>
              )}

              {recommendations.length > 0 && (
                <View className="mt-5">
                  <View className="mb-3 flex-row items-end justify-between px-4">
                    <View className="flex-1 pr-3">
                      <AppText className="font-bold text-lg text-foreground">Sizga mos</AppText>
                      <AppText className="mt-0.5 text-sm text-muted" numberOfLines={1}>
                        {"Ko'rgan va saqlagan e'lonlaringizga yaqin"}
                      </AppText>
                    </View>
                    <Ionicons name="sparkles-outline" size={20} color={BRAND_BLUE} />
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
                  >
                    {recommendations.map((listing) => {
                      const photo = listing.photoUrls?.[0];
                      const photoCount = listing.photoUrls?.length ?? 0;
                      const image = photo ? { uri: photo } : CATEGORY_IMAGES[listing.category];
                      return (
                        <Pressable
                          key={listing._id}
                          onPress={() => {
                            capture('home_recommendation_tap', { home_variant: homeVariant, listing_id: listing._id }, userId);
                            router.push({ pathname: '/listing/[id]', params: { id: listing._id } });
                          }}
                          className="overflow-hidden rounded-[22px] border border-white/70 bg-white/70 active:opacity-90"
                          style={[homeStyles.softCard, { width: 178 }]}
                        >
                          <View className="bg-white/65" style={{ height: 112 }}>
                            <Image
                              source={image}
                              contentFit={photo ? 'cover' : 'contain'}
                              style={
                                photo
                                  ? { width: '100%', height: '100%' }
                                  : { width: '84%', height: '84%', alignSelf: 'center', marginTop: 9 }
                              }
                            />
                            <Pressable
                              onPress={() => {
                                if (!toggleSave(listing._id)) router.push('/login');
                              }}
                              hitSlop={8}
                              className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-white/95"
                            >
                              <Ionicons
                                name={isSaved(listing._id) ? 'heart' : 'heart-outline'}
                                size={19}
                                color={isSaved(listing._id) ? '#EF4444' : BRAND_BLUE}
                              />
                            </Pressable>
                            {photoCount > 0 && (
                              <View className="absolute bottom-2 left-2 flex-row items-center rounded-md bg-black/60 px-1.5 py-0.5">
                                <Ionicons name="camera" size={12} color="white" />
                                <AppText className="ml-1 text-xs text-white">{photoCount}</AppText>
                              </View>
                            )}
                          </View>
                          <View className="p-3">
                            <AppText className="font-bold text-base text-foreground" numberOfLines={1}>
                              {listing.price}
                            </AppText>
                            <AppText className="mt-0.5 text-sm text-foreground" numberOfLines={1}>
                              {listing.title}
                            </AppText>
                            <View className="mt-2 flex-row items-center">
                              <Ionicons name="location-outline" size={14} color="#EF4444" />
                              <AppText className="ml-1 flex-1 text-xs text-muted" numberOfLines={1}>
                                {listing.city}
                              </AppText>
                            </View>
                          </View>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              <View className="mt-3" />
            </>
          }
          renderItem={({ item: row }) => {
            if (row.kind === 'dealer') {
              return <DealerAd d={row.dealer as unknown as DealerAdData} />;
            }
            const listing = row.listing;
            return (
              <View className="px-4 pb-3">
                <ListingCard
                  listing={{
                    ...listing,
                    promoted: !!listing.boostedUntil && listing.boostedUntil > feedNow,
                  }}
                  saved={isSaved(listing._id)}
                  onToggleSave={() => {
                    if (!toggleSave(listing._id)) router.push('/login');
                  }}
                  onMessage={
                    listing.ownerId && listing.ownerId !== userId
                      ? () => askPrice(listing)
                      : undefined
                  }
                  onPress={() => {
                    capture('home_listing_tap', { home_variant: homeVariant, listing_id: listing._id }, userId);
                    router.push({ pathname: '/listing/[id]', params: { id: listing._id } });
                  }}
                />
              </View>
            );
          }}
          ListFooterComponent={
            <>
              {feedStatus === 'LoadingMore' && (
                <View className="px-4 py-4">
                  <AppText className="text-center text-sm text-muted">Yuklanmoqda...</AppText>
                </View>
              )}
              <Pressable className="mx-4 mt-2 active:opacity-90" onPress={() => setSafetyOpen(true)}>
                <LinearGradient
                  colors={['#0A6CFF', '#3B82F6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center' }}
                >
                  <Ionicons name="shield-checkmark" size={26} color="white" />
                  <AppText className="ml-3 flex-1 font-semibold text-[15px] leading-5 text-white">
                    Ishonchli sotuvchilardan xavfsiz xarid qiling
                  </AppText>
                  <Ionicons name="chevron-forward" size={20} color="white" />
                </LinearGradient>
              </Pressable>
            </>
          }
        />

        {/* Safe-buying tips — opened from the trust banner */}
        <Modal visible={safetyOpen} transparent animationType="slide" onRequestClose={() => setSafetyOpen(false)}>
          <Pressable className="flex-1 bg-black/40" onPress={() => setSafetyOpen(false)} />
          <View className="rounded-t-3xl px-5 pb-8 pt-5" style={{ maxHeight: '85%', backgroundColor: '#EEF4FA' }}>
            <View className="mb-1 flex-row items-center">
              <Ionicons name="shield-checkmark" size={26} color={BRAND_BLUE} />
              <AppText className="ml-2 flex-1 font-bold text-xl text-foreground">Xavfsiz xarid qilish</AppText>
              <Pressable onPress={() => setSafetyOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={26} color="#9ca3af" />
              </Pressable>
            </View>
            <AppText className="mb-4 text-base text-muted">
              Firibgarlikdan saqlanish uchun ushbu oddiy qoidalarga amal qiling:
            </AppText>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { icon: 'eye', title: 'Hayvonni oʻz koʻzingiz bilan koʻring', body: 'Pul toʻlashdan oldin hayvonni koʻrib, tekshirib oling.' },
                { icon: 'cash-outline', title: 'Oldindan pul yubormang', body: 'Faqat hayvonni qoʻlingizga olgach toʻlov qiling. Old toʻlov — firibgarlikning asosiy belgisi.' },
                { icon: 'document-text-outline', title: 'Hujjatlarni soʻrang', body: 'Naslli hayvon boʻlsa, veterinariya va nasl hujjatlarini tekshiring.' },
                { icon: 'call-outline', title: 'Sotuvchi bilan gaplashing', body: 'Telefon yoki chat orqali bogʻlanib, barcha savollaringizni bering.' },
                { icon: 'location-outline', title: 'Xavfsiz joyda uchrashing', body: 'Odamlar koʻp, ochiq joyda uchrashuvni belgilang.' },
                { icon: 'flag-outline', title: 'Shubha tugʻilsa — shikoyat qiling', body: 'Firibgarlikka duch kelsangiz, eʼlondagi «Shikoyat qilish» tugmasini bosing.' },
              ].map((t) => (
                <View key={t.title} className="mb-3 flex-row items-start rounded-2xl border border-white/70 bg-white/70 p-3.5">
                  <View className="mr-3 h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: BRAND_BLUE + '14' }}>
                    <Ionicons name={t.icon as keyof typeof Ionicons.glyphMap} size={20} color={BRAND_BLUE} />
                  </View>
                  <View className="flex-1">
                    <AppText className="font-semibold text-base text-foreground">{t.title}</AppText>
                    <AppText className="mt-0.5 text-sm leading-5 text-muted">{t.body}</AppText>
                  </View>
                </View>
              ))}
            </ScrollView>
            <Pressable
              onPress={() => setSafetyOpen(false)}
              className="mt-2 h-13 items-center justify-center rounded-2xl py-4 active:opacity-90"
              style={{ backgroundColor: BRAND_BLUE }}
            >
              <AppText className="font-semibold text-base text-white">Tushunarli</AppText>
            </Pressable>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}
