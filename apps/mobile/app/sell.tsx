import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/app-text';
import { CATEGORY_IMAGES } from '../constants/category-images';

const BRAND_BLUE = '#0A6CFF';

type Category = {
  id: string;
  name: string;
  /** Temporary emoji placeholder — swap for a generated image later. */
  emoji: string;
  featured?: boolean;
};

const CATEGORIES: Category[] = [
  { id: 'cattle', name: 'Qoramol', emoji: '🐄', featured: true },
  { id: 'sheep', name: 'Qoʻy va echkilar', emoji: '🐑', featured: true },
  { id: 'horses', name: 'Otlar', emoji: '🐎' },
  { id: 'poultry', name: 'Parrandalar', emoji: '🐔' },
  { id: 'pets', name: 'Uy hayvonlari', emoji: '🐕' },
  { id: 'rabbits', name: 'Quyonlar', emoji: '🐇' },
  { id: 'fish', name: 'Baliqlar', emoji: '🐟' },
  { id: 'supplies', name: 'Yem-xashak va anjomlar', emoji: '🌾' },
];

export default function Sell() {
  const router = useRouter();

  const select = (id: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
    router.push({ pathname: '/create', params: { category: id } });
  };

  const featured = CATEGORIES.filter((c) => c.featured);
  const rest = CATEGORIES.filter((c) => !c.featured);

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="auto" />
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        {/* Back */}
        <View className="h-12 justify-center px-4">
          <Pressable
            onPress={() => router.back()}
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
            Nima sotyapsiz?
          </AppText>

          {/* Featured (full width) */}
          <View className="gap-3">
            {featured.map((c) => (
              <CategoryCard key={c.id} category={c} onPress={() => select(c.id)} featured />
            ))}
          </View>

          {/* Grid (2 columns) */}
          <View className="mt-3 flex-row flex-wrap justify-between">
            {rest.map((c) => (
              <View key={c.id} style={{ width: '48.5%' }} className="mb-3">
                <CategoryCard category={c} onPress={() => select(c.id)} />
              </View>
            ))}
          </View>
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

function CategoryCard({
  category,
  onPress,
  featured,
}: {
  category: Category;
  onPress: () => void;
  featured?: boolean;
}) {
  const image = CATEGORY_IMAGES[category.id];

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
