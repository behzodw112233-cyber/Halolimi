import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { CATEGORY_IMAGES } from '../constants/category-images';
import { BRAND_BLUE } from '../constants/theme';
import { AppText } from './app-text';

export interface CardListing {
  title: string;
  price: string;
  category: string;
  city: string;
  specs: { label: string; value: string }[];
  photoUrls?: string[];
  promoted?: boolean;
}

export function ListingCard({
  listing,
  onPress,
  saved: savedProp,
  onToggleSave,
}: {
  listing: CardListing;
  onPress?: () => void;
  /** Controlled saved state. When `onToggleSave` is provided this is authoritative. */
  saved?: boolean;
  onToggleSave?: () => void;
}) {
  const [localSaved, setLocalSaved] = useState(false);
  const controlled = !!onToggleSave;
  const saved = controlled ? !!savedProp : localSaved;
  const toggleSave = onToggleSave ?? (() => setLocalSaved((s) => !s));
  const photo = listing.photoUrls?.[0];
  const image = photo ? { uri: photo } : CATEGORY_IMAGES[listing.category];

  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl bg-surface p-3 active:opacity-90"
    >
      {/* Title + favorite */}
      <View className="flex-row items-start justify-between">
        <View className="mr-3 flex-1">
          {listing.promoted && (
            <View className="mb-1 self-start rounded-md px-1.5 py-0.5" style={{ backgroundColor: '#FCD34D' }}>
              <AppText className="text-[11px] font-bold" style={{ color: '#78350F' }}>TOP</AppText>
            </View>
          )}
          <AppText
            className="font-semibold text-[15px] leading-5"
            style={{ color: BRAND_BLUE }}
            numberOfLines={1}
          >
            {listing.title}
          </AppText>
        </View>
        <Pressable onPress={toggleSave} hitSlop={10}>
          <Ionicons
            name={saved ? 'heart' : 'heart-outline'}
            size={24}
            color={saved ? '#EF4444' : BRAND_BLUE}
          />
        </Pressable>
      </View>

      <AppText className="mb-3 mt-1 font-bold text-xl text-foreground">
        {listing.price}
      </AppText>

      <View className="flex-row">
        {/* Thumbnail */}
        <View
          className="mr-4 items-center justify-center overflow-hidden rounded-xl bg-surface-secondary"
          style={{ width: 150, height: 112 }}
        >
          <Image
            source={image}
            contentFit={photo ? 'cover' : 'contain'}
            style={photo ? { width: '100%', height: '100%' } : { width: '86%', height: '86%' }}
          />
          {!!listing.photoUrls?.length && (
            <View className="absolute bottom-1.5 left-1.5 flex-row items-center rounded-md bg-black/60 px-1.5 py-0.5">
              <Ionicons name="camera" size={12} color="white" />
              <AppText className="ml-1 text-xs text-white">{listing.photoUrls.length}</AppText>
            </View>
          )}
        </View>

        {/* Specs */}
        <View className="flex-1 justify-center gap-2">
          {listing.specs.slice(0, 3).map((spec, i) => (
            <View key={i} className="flex-row items-center">
              <Ionicons name="ellipse" size={6} color="#9ca3af" />
              <AppText className="ml-2 text-[15px] text-foreground" numberOfLines={1}>
                {spec.value}
              </AppText>
            </View>
          ))}
          <View className="flex-row items-center">
            <Ionicons name="location-outline" size={17} color="#EF4444" />
            <AppText className="ml-2 text-[15px] text-muted" numberOfLines={1}>
              {listing.city}
            </AppText>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
