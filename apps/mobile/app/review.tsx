import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/app-text';
import { BRAND_BLUE } from '../constants/theme';

export default function Review() {
  const router = useRouter();

  return (
    <View className="flex-1" style={{ backgroundColor: '#EEF4FA' }}>
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <View className="w-full flex-1 self-center px-5" style={{ maxWidth: 460 }}>
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1, paddingTop: 18, paddingBottom: 18 }}
          >
            <View className="items-center rounded-2xl bg-white px-5 py-6">
            <View
              className="mb-4 h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: BRAND_BLUE + '18' }}
            >
              <Ionicons name="shield-checkmark" size={29} color={BRAND_BLUE} />
            </View>

            <AppText className="text-center font-display text-2xl text-foreground">
              E'lon tekshiruvda
            </AppText>
            <AppText className="mt-2 text-center text-sm leading-5 text-muted">
              Adminlar odatda 10 daqiqa ichida ko'rib chiqadi.
            </AppText>

            <View className="mt-4 rounded-full bg-amber-100 px-4 py-2">
              <AppText className="font-semibold text-sm" style={{ color: '#92400E' }}>
                Admin tekshiruvida
              </AppText>
            </View>
          </View>

            <View className="mt-4 rounded-2xl bg-white px-4 py-2">
              <StatusRow icon="time-outline" title="Tekshiruv boshlandi" text="E'lon navbatga qo'shildi." active />
              <StatusRow icon="eye-outline" title="Admin ko'rib chiqadi" text="Rasm, narx va ma'lumotlar tekshiriladi." active />
              <StatusRow icon="rocket-outline" title="E'lon faollashadi" text="Tasdiqlangach xaridorlarga ko'rinadi." last />
            </View>

            <View className="flex-1" />

            <View className="mt-5">
              <Pressable
                onPress={() => router.replace('/home')}
                className="mb-3 h-14 items-center justify-center rounded-2xl active:opacity-80"
                style={{ backgroundColor: BRAND_BLUE + '1A' }}
              >
                <AppText className="font-semibold text-base" style={{ color: BRAND_BLUE }}>
                  Asosiyga qaytish
                </AppText>
              </Pressable>
              <Pressable
                onPress={() => router.replace('/sell')}
                className="h-14 items-center justify-center rounded-2xl active:opacity-90"
                style={{ backgroundColor: BRAND_BLUE }}
              >
                <AppText className="font-semibold text-base text-white">
                  Yana e'lon joylash
                </AppText>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

function StatusRow({
  icon,
  title,
  text,
  active = false,
  last = false,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  text: string;
  active?: boolean;
  last?: boolean;
}) {
  return (
    <View
      className="flex-row items-center py-3"
      style={{ borderBottomWidth: last ? 0 : 1, borderBottomColor: '#EEF2F7' }}
    >
      <View
        className="mr-3 h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: active ? BRAND_BLUE + '14' : '#F1F5F9' }}
      >
        <Ionicons name={icon} size={20} color={active ? BRAND_BLUE : '#94A3B8'} />
      </View>
      <View className="flex-1">
        <AppText className="font-semibold text-base text-foreground">{title}</AppText>
        <AppText className="mt-0.5 text-sm leading-5 text-muted">{text}</AppText>
      </View>
    </View>
  );
}
