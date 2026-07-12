import { Ionicons } from '@expo/vector-icons';
import { api } from '@halolmia/backend/convex/_generated/api';
import type { Id } from '@halolmia/backend/convex/_generated/dataModel';
import { useAction, useMutation, useQuery } from 'convex/react';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/app-text';
import { BRAND_BLUE } from '../constants/theme';
import { useAuth } from '../lib/auth';
import { hasExpoVideo, useVideoPlayer, VideoView } from '../lib/optional-native';
import { uploadToConvex } from '../lib/upload';

type PickedVideo = {
  uri: string;
  mimeType?: string;
  duration?: number;
};

const THUMBNAIL_MOMENTS = [1, 2, 4] as const;

const tap = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
};

function videoFileName(uri: string) {
  const cleanUri = uri.split('?')[0];
  return cleanUri.split('/').pop() || 'halolmia-reel.mp4';
}

function cloudflareThumbnailAt(url: string, second: number) {
  const joiner = url.includes('?') ? '&' : '?';
  return `${url}${joiner}time=${second}s&height=720`;
}

export default function VideoCreate() {
  const router = useRouter();
  const { userId } = useAuth();
  const categories = useQuery(api.categories.list) ?? [];
  const [video, setVideo] = useState<PickedVideo | null>(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [price, setPrice] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('cattle');
  const [thumbnailSecond, setThumbnailSecond] = useState<(typeof THUMBNAIL_MOMENTS)[number]>(2);
  const [busy, setBusy] = useState(false);

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const createReel = useMutation(api.reels.create);
  const createCloudflareUpload = useAction(api.cloudflareStream.createDirectUpload);
  const player = useVideoPlayer(video?.uri ?? '', (p) => {
    p.loop = true;
  });

  const pickFromCamera = async () => {
    tap();
    if (!hasExpoVideo) {
      Alert.alert('Video moduli kerak', 'Video ishlashi uchun ilovani qayta build qilib oÊ»rnating.');
      return;
    }
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Ruxsat kerak', 'Video olish uchun kameraga ruxsat bering.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      quality: 0.7,
      videoMaxDuration: 45,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });
    if (!res.canceled) {
      const asset = res.assets[0];
      setVideo({ uri: asset.uri, mimeType: asset.mimeType, duration: asset.duration ?? undefined });
    }
  };

  const pickFromGallery = async () => {
    tap();
    if (!hasExpoVideo) {
      Alert.alert('Video moduli kerak', 'Video ishlashi uchun ilovani qayta build qilib oÊ»rnating.');
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Ruxsat kerak', 'Video tanlash uchun galereyaga ruxsat bering.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 0.7,
      videoMaxDuration: 45,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });
    if (!res.canceled) {
      const asset = res.assets[0];
      setVideo({ uri: asset.uri, mimeType: asset.mimeType, duration: asset.duration ?? undefined });
    }
  };

  const publish = async () => {
    tap();
    if (!video || busy) return;
    if (!userId) {
      router.push('/login');
      return;
    }
    const selectedCategory = categories.find((c) => c.slug === category);
    const baseReel = {
      title: title.trim() || selectedCategory?.name || 'Video elon',
      caption: caption.trim() || undefined,
      sellerId: userId,
      category,
      city: city.trim() || undefined,
      price: price.trim() || undefined,
    };

    setBusy(true);
    try {
      let reelId: Id<'reels'>;
      try {
        const direct = await createCloudflareUpload({ maxDurationSeconds: 60 });
        const form = new FormData();
        form.append('file', {
          uri: video.uri,
          name: videoFileName(video.uri),
          type: video.mimeType ?? 'video/mp4',
        } as unknown as Blob);
        const cloudflareUpload = await fetch(direct.uploadUrl, {
          method: 'POST',
          body: form,
        });
        if (!cloudflareUpload.ok) {
          throw new Error(`Cloudflare upload failed with ${cloudflareUpload.status}`);
        }
        reelId = await createReel({
          ...baseReel,
          hlsUrl: direct.hlsUrl,
          thumbnailUrl: cloudflareThumbnailAt(direct.thumbnailUrl, thumbnailSecond),
          videoProvider: 'cloudflare',
          providerVideoId: direct.uid,
        });
      } catch {
        const uploadUrl = await generateUploadUrl();
        const storageId = await uploadToConvex(uploadUrl, video.uri, video.mimeType ?? 'video/mp4');
        if (!storageId) throw new Error('upload failed');
        reelId = await createReel({
          ...baseReel,
          videoId: storageId as Id<'_storage'>,
          videoProvider: 'convex',
        });
      }
      router.replace({ pathname: '/reels', params: { start: reelId } } as never);
    } catch {
      Alert.alert('Xatolik', 'Video yuklanmadi. Internetni tekshirib qayta urinib koring.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <View className="h-12 flex-row items-center px-4">
          <Pressable
            onPress={() => (video ? setVideo(null) : router.back())}
            hitSlop={12}
            className="h-9 w-9 items-center justify-center rounded-full"
          >
            <Ionicons name="arrow-back" size={24} color={BRAND_BLUE} />
          </Pressable>
          <AppText className="ml-2 flex-1 font-bold text-xl text-foreground">
            Video elon
          </AppText>
        </View>

        {!video ? (
          <View className="flex-1 px-5 pt-6">
            <AppText className="font-display text-4xl text-foreground">
              Hayvonni video bilan korsating
            </AppText>
            <AppText className="mt-2 text-base leading-6 text-muted">
              45 soniyagacha video oling. Xaridor hayvonni korsa, tezroq ishonadi.
            </AppText>

            <View className="mt-7 gap-3">
              <VideoSourceCard
                icon="camera"
                title="Kamerada olish"
                body="Hozir hayvonni video qilib oling"
                action="Kamerani ochish"
                onPress={pickFromCamera}
                accent
              />
              <VideoSourceCard
                icon="folder-open-outline"
                title="Galereyadan tanlash"
                body="Telefoningizdagi tayyor videoni yuklang"
                action="Video tanlash"
                onPress={pickFromGallery}
              />
            </View>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }}
          >
            <View className="mt-3 overflow-hidden rounded-3xl bg-black" style={{ aspectRatio: 9 / 14 }}>
              <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="cover" nativeControls />
            </View>

            <View className="mt-4 flex-row gap-2">
              <Pressable
                onPress={() => setVideo(null)}
                className="h-11 flex-1 items-center justify-center rounded-xl bg-surface-secondary active:opacity-80"
              >
                <AppText className="font-semibold text-base text-foreground">Qayta olish</AppText>
              </Pressable>
              <Pressable
                onPress={() => {
                  player.replay();
                  player.play();
                }}
                className="h-11 flex-1 flex-row items-center justify-center rounded-xl bg-surface-secondary active:opacity-80"
              >
                <Ionicons name="play" size={17} color={BRAND_BLUE} />
                <AppText className="ml-1.5 font-semibold text-base" style={{ color: BRAND_BLUE }}>
                  Korish
                </AppText>
              </Pressable>
            </View>

            <Field label="Muqova rasmi">
              <View className="flex-row gap-2">
                {THUMBNAIL_MOMENTS.map((second) => {
                  const active = thumbnailSecond === second;
                  return (
                    <Pressable
                      key={second}
                      onPress={() => setThumbnailSecond(second)}
                      className="h-20 flex-1 items-center justify-center overflow-hidden rounded-2xl border active:opacity-80"
                      style={{
                        backgroundColor: active ? BRAND_BLUE : '#EEF2F7',
                        borderColor: active ? BRAND_BLUE : '#E2E8F0',
                      }}
                    >
                      <Ionicons name="image-outline" size={22} color={active ? '#fff' : BRAND_BLUE} />
                      <AppText className="mt-1 font-bold text-base" style={{ color: active ? '#fff' : '#334155' }}>
                        {second}s
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </Field>

            <View className="mt-5 gap-3">
              <Field label="Sarlavha">
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Masalan: Qora mol, 450 kg"
                  placeholderTextColor="#9ca3af"
                  className="h-12 rounded-xl border border-border px-4 text-base text-foreground"
                  style={{ fontFamily: 'Inter-Regular' }}
                />
              </Field>
              <Field label="Narx">
                <TextInput
                  value={price}
                  onChangeText={setPrice}
                  placeholder="12 000 000 som"
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
                  className="h-12 rounded-xl border border-border px-4 text-base text-foreground"
                  style={{ fontFamily: 'Inter-Regular' }}
                />
              </Field>
              <Field label="Shahar">
                <TextInput
                  value={city}
                  onChangeText={setCity}
                  placeholder="Samarqand"
                  placeholderTextColor="#9ca3af"
                  className="h-12 rounded-xl border border-border px-4 text-base text-foreground"
                  style={{ fontFamily: 'Inter-Regular' }}
                />
              </Field>
              <Field label="Kategoriya">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {(categories.length ? categories : [{ slug: 'cattle', name: 'Qoramol' }]).map((c) => {
                    const active = category === c.slug;
                    return (
                      <Pressable
                        key={c.slug}
                        onPress={() => setCategory(c.slug)}
                        className="rounded-full px-4 py-2.5 active:opacity-80"
                        style={{ backgroundColor: active ? BRAND_BLUE : '#EEF2F7' }}
                      >
                        <AppText className="font-semibold text-sm" style={{ color: active ? '#fff' : '#334155' }}>
                          {c.name}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </Field>
              <Field label="Izoh">
                <TextInput
                  value={caption}
                  onChangeText={setCaption}
                  multiline
                  placeholder="Naslli, soglom, bozorda tayyor..."
                  placeholderTextColor="#9ca3af"
                  className="rounded-xl border border-border px-4 py-3 text-base text-foreground"
                  style={{ minHeight: 86, textAlignVertical: 'top', fontFamily: 'Inter-Regular' }}
                />
              </Field>
            </View>

            <Pressable
              onPress={publish}
              disabled={busy}
              className="mt-6 h-14 flex-row items-center justify-center rounded-2xl active:opacity-90"
              style={{ backgroundColor: busy ? '#94A3B8' : BRAND_BLUE }}
            >
              <Ionicons name="cloud-upload-outline" size={21} color="#fff" />
              <AppText className="ml-2 font-bold text-base text-white">
                {busy ? 'Yuklanmoqda...' : 'Video bozorga joylash'}
              </AppText>
            </Pressable>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

function VideoSourceCard({
  icon,
  title,
  body,
  action,
  accent,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  action: string;
  accent?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-3xl p-5 active:opacity-85"
      style={{ backgroundColor: accent ? BRAND_BLUE : '#EEF2F7' }}
    >
      <View className="flex-row items-start">
        <View
          className="h-12 w-12 items-center justify-center rounded-2xl"
          style={{ backgroundColor: accent ? '#fff' : BRAND_BLUE + '18' }}
        >
          <Ionicons name={icon} size={25} color={BRAND_BLUE} />
        </View>
        <View className="ml-4 flex-1">
          <AppText className={`font-bold text-2xl ${accent ? 'text-white' : 'text-foreground'}`}>
            {title}
          </AppText>
          <AppText className={`mt-1 text-base leading-6 ${accent ? 'text-white/80' : 'text-muted'}`}>
            {body}
          </AppText>
        </View>
      </View>
      <View className="mt-5 flex-row items-center justify-between">
        <AppText className={`font-semibold text-base ${accent ? 'text-white' : ''}`} style={!accent ? { color: BRAND_BLUE } : undefined}>
          {action}
        </AppText>
        <Ionicons name="arrow-forward" size={22} color={accent ? '#fff' : BRAND_BLUE} />
      </View>
    </Pressable>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <AppText className="mb-1.5 font-semibold text-sm text-muted">{label}</AppText>
      {children}
    </View>
  );
}
