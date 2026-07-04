import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/app-text';
import { BRAND_BLUE } from '../constants/theme';

interface Row {
  id: string;
  title: string;
  value?: string;
}

const ROWS: Row[] = [
  { id: 'lang', title: 'Til', value: 'Oʻzbekcha' },
  { id: 'currency', title: 'Valyuta', value: 'Shartli birliklar (y.e.)' },
  { id: 'refresh', title: 'Maʼlumotlar bazasini yangilash' },
  { id: 'about', title: 'Ilova haqida' },
  { id: 'terms', title: 'Foydalanuvchi shartnomasi' },
];

export default function Settings() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        {/* Header */}
        <View className="h-14 flex-row items-center border-b border-border px-3">
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            className="h-9 w-9 items-center justify-center rounded-full"
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <Ionicons name="arrow-back" size={24} color={BRAND_BLUE} />
          </Pressable>
          <AppText className="ml-1 font-bold text-xl text-foreground">
            Sozlamalar
          </AppText>
        </View>

        <View>
          {ROWS.map((row) => (
            <Pressable
              key={row.id}
              className="border-b border-border px-5 py-4 active:bg-surface-secondary"
            >
              <AppText className="text-lg text-foreground">{row.title}</AppText>
              {row.value && (
                <AppText className="mt-0.5 text-sm text-muted">{row.value}</AppText>
              )}
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
}
