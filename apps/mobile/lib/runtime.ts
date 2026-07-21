import { Platform } from 'react-native';

type TelegramWebAppGlobal = {
  Telegram?: {
    WebApp?: unknown;
  };
};

export const isWeb = Platform.OS === 'web';

export const isTelegramWebApp =
  Platform.OS === 'web' &&
  typeof globalThis !== 'undefined' &&
  !!(globalThis as TelegramWebAppGlobal).Telegram?.WebApp;

export const runtime = {
  isWeb,
  isTelegramWebApp,
  supportsPush: Platform.OS !== 'web',
  supportsIncomingCalls: Platform.OS !== 'web',
  supportsVideoCalls: Platform.OS !== 'web',
  supportsNativeCamera: Platform.OS !== 'web' && !isTelegramWebApp,
  supportsVideoPosting: !isTelegramWebApp,
  supportsReels: !isTelegramWebApp,
};
