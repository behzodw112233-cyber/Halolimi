import { api } from '@halolmia/backend/convex/_generated/api';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/app-text';
import { CATEGORY_IMAGES } from '../constants/category-images';
import { runtime } from '../lib/runtime';

const BRAND_BLUE = '#0A6CFF';

type Category = { slug: string; name: string; emoji: string };

export default function Sell() {
  const router = useRouter();
  const categories = useQuery(api.categories.list) ?? [];
  const [mode, setMode] = useState<'choose' | 'listing'>('choose');

  const select = (slug: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
    router.push({ pathname: '/create', params: { category: slug } });
  };

  const featured = categories.slice(0, 2);
  const rest = categories.slice(2);

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="auto" />
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        {/* Back */}
        <View className="h-12 justify-center px-4">
          <Pressable
            onPress={() => (mode === 'listing' ? setMode('choose') : router.back())}
            hitSlop={12}
            className="h-9 w-9 items-center justify-center rounded-full"
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <Ionicons name="arrow-back" size={24} color={BRAND_BLUE} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
        >
          <AppText className="mb-6 mt-2 font-display text-4xl text-foreground">
            {mode === 'choose' ? 'Nima joylaysiz?' : 'Nima sotyapsiz?'}
          </AppText>

          {mode === 'choose' ? (
            <View className="gap-3">
              <PostTypeCard
                icon="images-outline"
                title="Oddiy e'lon"
                body="Rasm, narx, vazn va tavsif bilan hozirgi e'lon oqimi"
                action="E'lon qo'shish"
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
                  setMode('listing');
                }}
              />
              {runtime.supportsVideoPosting ? (
                <PostTypeCard
                  icon="videocam-outline"
                  title="Video e'lon"
                  body="Hayvonni kamerada oling yoki galereyadan video tanlang"
                  action="Video qo'shish"
                  accent
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
                    router.push('/video-create' as never);
                  }}
                />
              ) : null}
            </View>
          ) : (
            <>
          {/* Featured (full width) */}
          <View className="gap-3">
            {featured.map((c) => (
              <CategoryCard key={c._id} category={c} onPress={() => select(c.slug)} featured />
            ))}
          </View>

          {/* Grid (2 columns) */}
          <View className="mt-3 flex-row flex-wrap justify-between">
            {rest.map((c) => (
              <View key={c._id} style={{ width: '48.5%' }} className="mb-3">
                <CategoryCard category={c} onPress={() => select(c.slug)} />
              </View>
            ))}
          </View>
            </>
          )}
        </ScrollView>

        {/* Footer */}
        <View className="border-t border-border px-6 py-4">
          <AppText className="text-center text-sm leading-5 text-muted">
            Eʼlon joylashtirayotganingizda, siz{' '}
            <AppText className="text-sm font-medium" style={{ color: BRAND_BLUE }}>
              ushbu qoidalarga
            </AppText>{' '}
            rozilik bildirasiz
          </AppText>
        </View>
      </SafeAreaView>
    </View>
  );
}

function PostTypeCard({
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
      className="overflow-hidden rounded-2xl bg-surface-secondary p-5 active:opacity-85"
      style={{ minHeight: 154, backgroundColor: accent ? BRAND_BLUE : undefined }}
    >
      <View className="flex-row items-start">
        <View
          className="h-12 w-12 items-center justify-center rounded-2xl"
          style={{ backgroundColor: accent ? '#fff' : BRAND_BLUE + '18' }}
        >
          <Ionicons name={icon} size={25} color={accent ? BRAND_BLUE : BRAND_BLUE} />
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

function CategoryCard({
  category,
  onPress,
  featured,
}: {
  category: Category;
  onPress: () => void;
  featured?: boolean;
}) {
  const image = CATEGORY_IMAGES[category.slug];

  return (
    <Pressable
      onPress={onPress}
      className="overflow-hidden rounded-2xl bg-surface-secondary active:opacity-80"
      style={{ height: featured ? 128 : 118 }}
    >
      <View className="z-10 flex-1 justify-between p-4">
        <AppText
          className={`font-semibold text-foreground ${featured ? 'text-xl' : 'text-base'}`}
          style={{ maxWidth: featured ? '55%' : '75%' }}
        >
          {category.name}
        </AppText>
      </View>

      {image ? (
        <Image
          source={image}
          contentFit="contain"
          style={{
            position: 'absolute',
            right: featured ? 12 : 4,
            bottom: 0,
            top: 0,
            width: featured ? '52%' : '58%',
          }}
        />
      ) : (
        <AppText
          style={{
            position: 'absolute',
            right: featured ? 24 : 10,
            bottom: featured ? 14 : 8,
            fontSize: featured ? 68 : 52,
          }}
        >
          {category.emoji}
        </AppText>
      )}
    </Pressable>
  );
}
