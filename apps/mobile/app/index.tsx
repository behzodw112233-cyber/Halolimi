import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { Spinner } from 'heroui-native';
import { useAuth } from '../lib/auth';

/**
 * Entry point. Once a user has been through onboarding (or logged in) we send
 * them straight to the feed; otherwise we start the language / intro flow.
 */
export default function Index() {
  const { loading, onboarded } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Spinner />
      </View>
    );
  }

  return <Redirect href={onboarded ? '/home' : '/language'} />;
}
