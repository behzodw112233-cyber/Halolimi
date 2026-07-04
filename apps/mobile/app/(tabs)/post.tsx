import { Redirect } from 'expo-router';

/**
 * Placeholder for the center "Sotish" tab. The tab bar button intercepts the
 * press and opens `/sell`, so this screen is never actually shown — the redirect
 * is just a safety net.
 */
export default function Post() {
  return <Redirect href="/sell" />;
}
