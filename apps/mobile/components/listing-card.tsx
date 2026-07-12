import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { CATEGORY_IMAGES } from '../constants/category-images';
import { BRAND_BLUE } from '../constants/theme';
import { AppText } from './app-text';
import { DealerBadge, VerifiedSellerBadge } from './trust-safety';

export interface CardListing {
  title: string;
  price: string;
  category: string;
  city: string;
  specs: { label: string; value: string }[];
  photoUrls?: string[];
  photoCount?: number;
  promoted?: boolean;
  /** Distance in km from the buyer (set when searching "Yaqin atrofda"). */
  distanceKm?: number | null;
  sellerTrust?: {
    verified?: boolean;
    isDealer?: boolean;
    rating?: number;
    ratingCount?: number;
  } | null;
}

export function ListingCard({
  listing,
  onPress,
  saved: savedProp,
  onToggleSave,
  onMessage,
}: {
  listing: CardListing;
  onPress?: () => void;
  /** Controlled saved state. When `onToggleSave` is provided this is authoritative. */
  saved?: boolean;
  onToggleSave?: () => void;
  /** When provided (buyer viewing someone else's listing), shows a quick "ask price" chat button. */
  onMessage?: () => void;
}) {
  const [localSaved, setLocalSaved] = useState(false);
  const controlled = !!onToggleSave;
  const saved = controlled ? !!savedProp : localSaved;
  const toggleSave = onToggleSave ?? (() => setLocalSaved((s) => !s));
  const photo = listing.photoUrls?.[0];
  const photoCount = listing.photoCount ?? listing.photoUrls?.length ?? 0;
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
          {listing.sellerTrust?.verified && (
            <View className="mb-1 self-start">
              <VerifiedSellerBadge compact />
            </View>
          )}
          {listing.sellerTrust?.isDealer && (
            <View className="mb-1 self-start">
              <DealerBadge compact />
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
        <View className="flex-row items-center gap-2.5">
          {onMessage && (
            <Pressable
              onPress={onMessage}
              hitSlop={8}
              className="h-8 flex-row items-center rounded-full px-2.5 active:opacity-70"
              style={{ backgroundColor: BRAND_BLUE + '15' }}
            >
              <Ionicons name="chatbubble-ellipses" size={15} color={BRAND_BLUE} />
              <AppText className="ml-1 text-[13px] font-semibold" style={{ color: BRAND_BLUE }}>
                Narx?
              </AppText>
            </Pressable>
          )}
          <Pressable onPress={toggleSave} hitSlop={10}>
            <Ionicons
              name={saved ? 'heart' : 'heart-outline'}
              size={24}
              color={saved ? '#EF4444' : BRAND_BLUE}
            />
          </Pressable>
        </View>
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
          {photoCount > 0 && (
            <View className="absolute bottom-1.5 left-1.5 flex-row items-center rounded-md bg-black/60 px-1.5 py-0.5">
              <Ionicons name="camera" size={12} color="white" />
              <AppText className="ml-1 text-xs text-white">{photoCount}</AppText>
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
              {typeof listing.distanceKm === 'number' && (
                <AppText className="text-[15px]" style={{ color: BRAND_BLUE }}>
                  {`  ·  ~${listing.distanceKm} km`}
                </AppText>
              )}
            </AppText>
          </View>
          {!!listing.sellerTrust?.ratingCount && (
            <View className="flex-row items-center">
              <Ionicons name="star" size={15} color="#F59E0B" />
              <AppText className="ml-2 text-[14px] text-muted" numberOfLines={1}>
                {listing.sellerTrust.rating?.toFixed(1)} sotuvchi reytingi
              </AppText>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}
