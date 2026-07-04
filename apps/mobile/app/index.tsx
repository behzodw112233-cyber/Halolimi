import { Redirect } from 'expo-router';

/**
 * Entry point. For now we always send the user to the language picker while we
 * build the UI. Later this will check a "has completed intro" flag (AsyncStorage
 * / Convex) and redirect to the tabs or auth flow instead.
 */
export default function Index() {
  return <Redirect href="/language" />;
}
