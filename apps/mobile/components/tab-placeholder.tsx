import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND_BLUE } from '../constants/theme';
import { AppText } from './app-text';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/** Simple "coming soon" screen for tabs we haven't built yet. */
export function TabPlaceholder({
  title,
  icon,
}: {
  title: string;
  icon: IoniconName;
}) {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-background px-8">
      <View
        className="mb-5 h-16 w-16 items-center justify-center rounded-2xl"
        style={{ backgroundColor: BRAND_BLUE + '14' }}
      >
        <Ionicons name={icon} size={30} color={BRAND_BLUE} />
      </View>
      <AppText className="mb-1 font-semibold text-xl text-foreground">
        {title}
      </AppText>
      <AppText className="text-center text-base text-muted">
        Tez orada tayyor boʻladi.
      </AppText>
    </SafeAreaView>
  );
}
