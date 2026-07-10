import { api } from '@halolmia/backend/convex/_generated/api';
import { Ionicons } from '@expo/vector-icons';
import { usePaginatedQuery, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/app-text';
import { ListingCard } from '../components/listing-card';
import { BRAND_BLUE } from '../constants/theme';
import { UZ_CITIES } from '../constants/cities';
import { useSaved } from '../lib/saved';

const RATING_FILTERS = [4.5, 4, 3];

function toNumber(value: string) {
  const digits = value.replace(/[^\d]/g, '');
  return digits ? Number(digits) : undefined;
}

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs, value]);

  return debounced;
}

export default function Search() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    category?: string;
    q?: string;
    city?: string;
    priceMax?: string;
  }>();
  const initialCategory = firstParam(params.category);
  const initialQ = firstParam(params.q);
  const initialCity = firstParam(params.city);
  const initialPriceMax = firstParam(params.priceMax);

  const [q, setQ] = useState(initialQ ?? '');
  const [category, setCategory] = useState(initialCategory ?? '');
  const [city, setCity] = useState(initialCity ?? '');
  const [breed, setBreed] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState(initialPriceMax ?? '');
  const [weightMin, setWeightMin] = useState('');
  const [weightMax, setWeightMax] = useState('');
  const [hasPhotos, setHasPhotos] = useState(false);
  const [minRating, setMinRating] = useState<number | undefined>();
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [searchNow] = useState(() => Math.floor(Date.now() / 60_000) * 60_000);
  const debouncedQ = useDebouncedValue(q, 350);

  const categories = useQuery(api.categories.list) ?? [];
  const { isSaved, toggleSave } = useSaved();

  const args = useMemo(
    () => ({
      q: debouncedQ.trim() || undefined,
      category: category || undefined,
      city: city || undefined,
      breed: breed.trim() || undefined,
      priceMin: toNumber(priceMin),
      priceMax: toNumber(priceMax),
      weightMin: toNumber(weightMin),
      weightMax: toNumber(weightMax),
      hasPhotos: hasPhotos || undefined,
      minRating,
      now: searchNow,
    }),
    [breed, category, city, debouncedQ, hasPhotos, minRating, priceMax, priceMin, searchNow, weightMax, weightMin]
  );

  const {
    results: listings,
    status: searchStatus,
    loadMore,
  } = usePaginatedQuery(api.listings.search, args, { initialNumItems: 24 });
  const activeFilterCount = [
    category,
    city,
    breed.trim(),
    priceMin,
    priceMax,
    weightMin,
    weightMax,
    hasPhotos,
    minRating,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setCategory('');
    setCity('');
    setBreed('');
    setPriceMin('');
    setPriceMax('');
    setWeightMin('');
    setWeightMax('');
    setHasPhotos(false);
    setMinRating(undefined);
  };

  const loadMoreListings = () => {
    if (searchStatus === 'CanLoadMore') loadMore(24);
  };

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="h-12 flex-row items-center px-3">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}
            hitSlop={10}
            className="h-9 w-9 items-center justify-center"
          >
            <Ionicons name="arrow-back" size={24} color={BRAND_BLUE} />
          </Pressable>
          <AppText className="ml-1 flex-1 font-bold text-xl text-foreground">
            Qidirish
          </AppText>
          <Pressable
            onPress={() => setFiltersOpen((v) => !v)}
            className="h-9 flex-row items-center justify-center rounded-full px-3 active:opacity-80"
            style={{ backgroundColor: activeFilterCount ? BRAND_BLUE : '#F1F3F5' }}
          >
            <Ionicons name="options-outline" size={18} color={activeFilterCount ? '#fff' : BRAND_BLUE} />
            {activeFilterCount > 0 && (
              <AppText className="ml-1 text-sm font-semibold text-white">{activeFilterCount}</AppText>
            )}
          </Pressable>
        </View>

        <FlatList
          data={listings}
          keyExtractor={(listing) => listing._id}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 28 }}
          onEndReached={loadMoreListings}
          onEndReachedThreshold={0.7}
          ListHeaderComponent={
            <>
          <View className="px-4 pb-3">
            <View className="h-12 flex-row items-center rounded-xl bg-surface-secondary px-4">
              <Ionicons name="search" size={20} color="#9ca3af" />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Hayvon, zot yoki shahar"
                placeholderTextColor="#9ca3af"
                returnKeyType="search"
                className="ml-3 flex-1 text-base text-foreground"
                style={{ fontFamily: 'Inter-Regular' }}
              />
              {q.length > 0 && (
                <Pressable onPress={() => setQ('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={19} color="#9ca3af" />
                </Pressable>
              )}
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 4 }}
          >
            <FilterChip label="Hammasi" active={!category} onPress={() => setCategory('')} />
            {categories.map((c) => (
              <FilterChip
                key={c._id}
                label={c.name}
                active={category === c.slug}
                onPress={() => setCategory(category === c.slug ? '' : c.slug)}
              />
            ))}
          </ScrollView>

          {filtersOpen && (
            <View className="mx-4 mt-3 rounded-2xl bg-surface p-4">
              <View className="mb-3 flex-row items-center justify-between">
                <AppText className="font-bold text-lg text-foreground">Filtrlar</AppText>
                <Pressable onPress={clearFilters} hitSlop={8}>
                  <AppText className="font-semibold text-sm" style={{ color: BRAND_BLUE }}>
                    Tozalash
                  </AppText>
                </Pressable>
              </View>

              <AppText className="mb-2 font-semibold text-sm text-foreground">Shahar</AppText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
              >
                <FilterChip label="Hammasi" active={!city} onPress={() => setCity('')} small />
                {UZ_CITIES.slice(0, 8).map((c) => (
                  <FilterChip
                    key={c}
                    label={c}
                    active={city === c}
                    onPress={() => setCity(city === c ? '' : c)}
                    small
                  />
                ))}
              </ScrollView>

              <View className="mb-3">
                <AppText className="mb-2 font-semibold text-sm text-foreground">Zot</AppText>
                <Input value={breed} onChangeText={setBreed} placeholder="Masalan: Hisor" />
              </View>

              <AppText className="mb-2 font-semibold text-sm text-foreground">
                {"Narx oralig'i"}
              </AppText>
              <View className="mb-3 flex-row gap-2">
                <Input value={priceMin} onChangeText={setPriceMin} placeholder="Min" keyboardType="number-pad" />
                <Input value={priceMax} onChangeText={setPriceMax} placeholder="Max" keyboardType="number-pad" />
              </View>

              <AppText className="mb-2 font-semibold text-sm text-foreground">Vazn, kg</AppText>
              <View className="mb-3 flex-row gap-2">
                <Input value={weightMin} onChangeText={setWeightMin} placeholder="Min" keyboardType="number-pad" />
                <Input value={weightMax} onChangeText={setWeightMax} placeholder="Max" keyboardType="number-pad" />
              </View>

              <View className="mb-3 flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons name="camera-outline" size={20} color={BRAND_BLUE} />
                  <AppText className="ml-2 font-semibold text-sm text-foreground">
                    Faqat rasmi borlar
                  </AppText>
                </View>
                <Pressable
                  onPress={() => setHasPhotos((v) => !v)}
                  className="h-8 w-14 justify-center rounded-full px-1"
                  style={{ backgroundColor: hasPhotos ? BRAND_BLUE : '#E5E7EB' }}
                >
                  <View
                    className="h-6 w-6 rounded-full bg-white"
                    style={{ alignSelf: hasPhotos ? 'flex-end' : 'flex-start' }}
                  />
                </Pressable>
              </View>

              <AppText className="mb-2 font-semibold text-sm text-foreground">Sotuvchi reytingi</AppText>
              <View className="flex-row flex-wrap gap-2">
                <FilterChip
                  label="Hammasi"
                  active={minRating === undefined}
                  onPress={() => setMinRating(undefined)}
                  small
                />
                {RATING_FILTERS.map((rating) => (
                  <FilterChip
                    key={rating}
                    label={`${rating}+`}
                    active={minRating === rating}
                    onPress={() => setMinRating(minRating === rating ? undefined : rating)}
                    icon="star"
                    small
                  />
                ))}
              </View>
            </View>
          )}

          <View className="mt-5 px-4">
            <AppText className="font-bold text-lg text-foreground">
              {searchStatus === 'LoadingFirstPage'
                ? 'Qidirilmoqda...'
                : `${listings.length} ta e\u0027lon yuklandi`}
            </AppText>
            <AppText className="mt-1 text-sm text-muted">
              {'Mos e\u0027lonlar eng yaxshilari tepada chiqadi'}
            </AppText>
          </View>

          <View className="mt-3" />
            </>
          }
          renderItem={({ item: listing }) => (
            <View className="px-4 pb-3">
              <ListingCard
                listing={{
                  ...listing,
                  promoted: listing.boostActive,
                }}
                saved={isSaved(listing._id)}
                onToggleSave={() => {
                  if (!toggleSave(listing._id)) router.push('/login');
                }}
                onPress={() => router.push({ pathname: '/listing/[id]', params: { id: listing._id } })}
              />
            </View>
          )}
          ListEmptyComponent={
            searchStatus === 'LoadingFirstPage' ? null : (
              <View className="mx-4 items-center rounded-2xl bg-surface p-8">
                <Ionicons name="search-outline" size={42} color="#9ca3af" />
                <AppText className="mt-3 text-center font-semibold text-base text-foreground">
                  Hech narsa topilmadi
                </AppText>
                <AppText className="mt-1 text-center text-sm leading-5 text-muted">
                  {"Filtrlarni yengillashtirib qayta urinib ko'ring."}
                </AppText>
              </View>
            )
          }
          ListFooterComponent={
            searchStatus === 'LoadingMore' ? (
              <View className="px-4 py-4">
                <AppText className="text-center text-sm text-muted">Yuklanmoqda...</AppText>
              </View>
            ) : null
          }
        />
      </SafeAreaView>
    </View>
  );
}

function Input({
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'number-pad';
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9ca3af"
      keyboardType={keyboardType}
      className="h-11 flex-1 rounded-xl border border-border px-3 text-base text-foreground"
      style={{ fontFamily: 'Inter-Regular' }}
    />
  );
}

function FilterChip({
  label,
  active,
  onPress,
  icon,
  small,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  small?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center rounded-full border active:opacity-80"
      style={{
        minHeight: small ? 34 : 40,
        paddingHorizontal: small ? 12 : 15,
        backgroundColor: active ? BRAND_BLUE : '#fff',
        borderColor: active ? BRAND_BLUE : '#E5E7EB',
      }}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={small ? 14 : 16}
          color={active ? '#fff' : BRAND_BLUE}
          style={{ marginRight: 5 }}
        />
      )}
      <AppText
        className={small ? 'text-sm font-medium' : 'text-base font-medium'}
        style={{ color: active ? '#fff' : '#374151' }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}
