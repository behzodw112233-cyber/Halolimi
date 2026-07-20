import { ActivityIndicator, Pressable, View } from 'react-native';
import { AppText } from './app-text';
import { BRAND_BLUE } from '../constants/theme';

export function EmbeddedStripeCheckout({
  clientSecret,
  onComplete,
  onCancel,
}: {
  clientSecret: string;
  onComplete: () => void;
  onCancel: () => void;
}) {
  void clientSecret;
  void onComplete;
  return (
    <View className="rounded-2xl border border-border bg-surface p-4">
      <View className="flex-row items-center justify-center py-3">
        <ActivityIndicator color={BRAND_BLUE} />
        <AppText className="ml-2 text-sm text-muted">Stripe checkout tayyorlanmoqda...</AppText>
      </View>
      <Pressable
        onPress={onCancel}
        className="mt-2 h-11 items-center justify-center rounded-xl border border-border"
      >
        <AppText className="font-semibold text-sm text-foreground">Orqaga</AppText>
      </Pressable>
    </View>
  );
}
