import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { CATEGORY_IMAGES } from '../constants/category-images';
import { BRAND_BLUE } from '../constants/theme';
import type { Listing } from '../constants/listings';
import { AppText } from './app-text';

export function ListingCard({
  listing,
  onPress,
}: {
  listing: Listing;
  onPress?: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const image = CATEGORY_IMAGES[listing.category];

  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl bg-surface p-3 active:opacity-90"
    >
      {/* Title + favorite */}
      <View className="flex-row items-start justify-between">
        <AppText
          className="mr-3 flex-1 font-semibold text-[15px] leading-5"
          style={{ color: BRAND_BLUE }}
          numberOfLines={1}
        >
          {listing.title}
        </AppText>
        <Pressable onPress={() => setSaved((s) => !s)} hitSlop={10}>
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
            contentFit="contain"
            style={{ width: '86%', height: '86%' }}
          />
          <View className="absolute bottom-1.5 left-1.5 flex-row items-center rounded-md bg-black/60 px-1.5 py-0.5">
            <Ionicons name="camera" size={12} color="white" />
            <AppText className="ml-1 text-xs text-white">{listing.photos}</AppText>
          </View>
        </View>

        {/* Specs */}
        <View className="flex-1 justify-center gap-2">
          {listing.specs.map((spec, i) => (
            <View key={i} className="flex-row items-center">
              <Ionicons name={spec.icon} size={17} color="#9ca3af" />
              <AppText className="ml-2 text-[15px] text-foreground">
                {spec.label}
              </AppText>
            </View>
          ))}
          <View className="flex-row items-center">
            <Ionicons name="location-outline" size={17} color="#EF4444" />
            <AppText className="ml-2 text-[15px] text-muted" numberOfLines={1}>
              {listing.location}
            </AppText>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
