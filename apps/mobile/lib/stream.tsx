import { api } from '@halolmia/backend/convex/_generated/api';
import { useConvex } from 'convex/react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Chat, OverlayProvider } from 'stream-chat-expo';
import type { StreamChat } from 'stream-chat';
import {
  StreamVideo,
  StreamVideoClient,
} from '@stream-io/video-react-native-sdk';
import { useAuth } from './auth';

const STREAM_KEY = process.env.EXPO_PUBLIC_STREAM_KEY ?? '';

interface StreamValue {
  chatClient: StreamChat | null;
  videoClient: StreamVideoClient | null;
}
const StreamContext = createContext<StreamValue>({ chatClient: null, videoClient: null });

/** Access the connected Stream chat/video clients (null until connected / logged in). */
export function useStream() {
  return useContext(StreamContext);
}

/**
 * Connects the Stream chat + video clients for the logged-in user. Tokens are
 * minted by the Convex `stream.token` endpoint (secret stays server-side), and
 * the client refreshes them on expiry via the tokenProvider.
 */
function ConnectedStream({ userId, children }: { userId: string; children: ReactNode }) {
  const { user } = useAuth();
  const convex = useConvex();

  const tokenProvider = useCallback(async () => {
    const res = await convex.mutation(api.stream.token, { userId: userId as never });
    return res.token;
  }, [convex, userId]);

  const userData = useMemo(
    () => ({ id: userId, name: user?.name ?? 'Foydalanuvchi' }),
    [userId, user?.name]
  );

  // Chat client (returns undefined while connecting; never pass null to <Chat>).
  const [chatClient, setChatClient] = useState<StreamChat | null>(null);
  useEffect(() => {
    let cancelled = false;
    let client: StreamChat | undefined;
    // Lazy-require so this module is safe if the SDK isn't bundled (web export).
    const { StreamChat: SC } = require('stream-chat') as { StreamChat: typeof StreamChat };
    client = SC.getInstance(STREAM_KEY);
    client
      .connectUser(userData, tokenProvider)
      .then(() => {
        if (!cancelled) setChatClient(client!);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      client?.disconnectUser().catch(() => {});
      setChatClient(null);
    };
  }, [userData, tokenProvider]);

  // Video client (getOrCreateInstance — never `new`).
  const [videoClient, setVideoClient] = useState<StreamVideoClient | null>(null);
  useEffect(() => {
    const client = StreamVideoClient.getOrCreateInstance({
      apiKey: STREAM_KEY,
      user: userData,
      tokenProvider,
    });
    setVideoClient(client);
    return () => {
      client.disconnectUser().catch(() => {});
      setVideoClient(null);
    };
  }, [userData, tokenProvider]);

  const value = useMemo(() => ({ chatClient, videoClient }), [chatClient, videoClient]);

  // OverlayProvider must sit above navigation for long-press menus / attachment picker.
  let tree = children;
  if (videoClient) tree = <StreamVideo client={videoClient}>{tree}</StreamVideo>;
  if (chatClient) tree = <Chat client={chatClient}>{tree}</Chat>;

  return (
    <StreamContext.Provider value={value}>
      <OverlayProvider>{tree}</OverlayProvider>
    </StreamContext.Provider>
  );
}

/** Mounts Stream only when a user is logged in and a key is configured. */
export function StreamProviders({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  if (!STREAM_KEY || !userId) return <>{children}</>;
  return (
    <ConnectedStream key={userId} userId={userId}>
      {children}
    </ConnectedStream>
  );
}
