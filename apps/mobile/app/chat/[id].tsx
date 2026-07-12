import { Ionicons } from '@expo/vector-icons';
import { api } from '@halolmia/backend/convex/_generated/api';
import type { Id } from '@halolmia/backend/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/app-text';
import {
  DealSafetyTips,
  RatingPromptSheet,
  SafetyBanner,
  SuspiciousMessageWarning,
} from '../../components/trust-safety';
import { BRAND_BLUE } from '../../constants/theme';
import { useAuth } from '../../lib/auth';
import {
  AudioModule,
  RecordingPresets,
  hasExpoAudio,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from '../../lib/optional-native';
import { uploadToConvex } from '../../lib/upload';

type Msg = FunctionReturnType<typeof api.messages.list>[number];

const SELLER_REPORT_REASONS = [
  'Firibgarlik gumoni',
  'Oldindan pul soʻrayapti',
  'Haqoratli muomala',
  'Notoʻgʻri maʼlumot berdi',
  'Boshqa sabab',
];
const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const TYPING_THROTTLE = 2500;
const SUSPICIOUS_RE = /(oldindan|avans|karta|plastik|pul tashla|pul yubor|payme|click|kod|sms|parol|password)/i;

/** HH:MM in 24h, locale-safe on Android. */
function clock(ms: number) {
  const d = new Date(ms);
  return `${`${d.getHours()}`.padStart(2, '0')}:${`${d.getMinutes()}`.padStart(2, '0')}`;
}

/** m:ss for voice message durations. */
function fmtDuration(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${`${s % 60}`.padStart(2, '0')}`;
}

/** Group a message's reactions into [emoji, count] pairs. */
function groupReactions(reactions: Msg['reactions']) {
  const map = new Map<string, number>();
  for (const r of reactions ?? []) map.set(r.emoji, (map.get(r.emoji) ?? 0) + 1);
  return [...map.entries()];
}

/** Three-dot "typing…" bubble with a gentle looping fade. */
function TypingBubble() {
  const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];
  useEffect(() => {
    const loops = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(d, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0.3, duration: 350, useNativeDriver: true }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <View className="items-start px-3 py-1">
      <View className="flex-row items-center rounded-2xl px-4 py-3" style={{ backgroundColor: '#EAEAEC' }}>
        {dots.map((d, i) => (
          <Animated.View
            key={i}
            style={{ opacity: d, width: 7, height: 7, borderRadius: 4, backgroundColor: '#888', marginHorizontal: 2 }}
          />
        ))}
      </View>
    </View>
  );
}

/** Tap-to-play voice message bubble with a progress bar and duration. */
function VoiceBubble({ uri, duration, mine }: { uri: string; duration: number; mine: boolean }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const dur = status.duration || duration || 0;
  const progress = dur > 0 ? Math.min(1, status.currentTime / dur) : 0;
  const remaining = status.playing || status.currentTime > 0 ? dur - status.currentTime : dur;

  useEffect(() => {
    if (status.didJustFinish) player.seekTo(0);
  }, [status.didJustFinish, player]);

  return (
    <Pressable
      onPress={() => (status.playing ? player.pause() : player.play())}
      hitSlop={4}
      className="flex-row items-center"
      style={{ width: 180 }}
    >
      <View
        className="mr-2 h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: mine ? '#ffffff30' : BRAND_BLUE }}
      >
        <Ionicons name={status.playing ? 'pause' : 'play'} size={16} color={mine ? '#fff' : '#fff'} style={status.playing ? undefined : { marginLeft: 2 }} />
      </View>
      <View className="flex-1">
        <View className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: mine ? '#ffffff40' : '#00000022' }}>
          <View
            className="h-1.5 rounded-full"
            style={{ width: `${progress * 100}%`, backgroundColor: mine ? '#fff' : BRAND_BLUE }}
          />
        </View>
        <AppText className="mt-1 text-[11px]" style={{ color: mine ? '#ffffffCC' : '#666' }}>
          {fmtDuration(remaining)}
        </AppText>
      </View>
    </Pressable>
  );
}

export default function Conversation() {
  const router = useRouter();
  const { id, name = 'Sotuvchi', sellerId } = useLocalSearchParams<{
    id: string;
    name?: string;
    sellerId?: string;
  }>();
  const threadId = String(id);
  const { userId, user } = useAuth();
  const { top, bottom } = useSafeAreaInsets();
  const headerHeight = (Platform.OS === 'ios' ? 44 : 56) + top;
  const sellerUserId = sellerId as Id<'users'> | undefined;
  const senderName = user?.name ?? user?.phone ?? 'Xaridor';

  const messages = useQuery(api.messages.list, { threadId });
  const info = useQuery(api.messages.threadInfo, { threadId, userId: userId ?? undefined });
  const send = useMutation(api.messages.send);
  const markRead = useMutation(api.messages.markRead);
  const setTyping = useMutation(api.messages.setTyping);
  const react = useMutation(api.messages.react);
  const editMsg = useMutation(api.messages.edit);
  const deleteMsg = useMutation(api.messages.deleteMessage);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const submitReview = useMutation(api.reviews.create);
  const reportSeller = useMutation(api.reports.reportSeller);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: Id<'messages'>; name: string; text: string } | null>(null);
  const [editing, setEditing] = useState<{ id: Id<'messages'> } | null>(null);
  const [actionMsg, setActionMsg] = useState<Msg | null>(null);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const lastTypedRef = useRef(0);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 200);

  const otherName = info?.otherName ?? String(name);
  const callTarget = sellerUserId ?? ((info?.otherId ?? undefined) as Id<'users'> | undefined);
  const canCall = !!callTarget && callTarget !== userId;
  const canReviewSeller = !!sellerUserId && sellerUserId !== userId;
  const otherLastReadAt = info?.otherLastReadAt ?? 0;
  const suspiciousDraft = SUSPICIOUS_RE.test(draft);

  // Newest first for an inverted list (feels like every chat app).
  const data = useMemo(() => (messages ? [...messages].reverse() : []), [messages]);

  // Clear our unread badge whenever the thread opens or a new message lands.
  useEffect(() => {
    if (userId && messages) markRead({ threadId, userId }).catch(() => {});
  }, [userId, threadId, messages?.length, markRead]);

  const onChangeDraft = useCallback(
    (t: string) => {
      setDraft(t);
      const now = Date.now();
      if (userId && now - lastTypedRef.current > TYPING_THROTTLE) {
        lastTypedRef.current = now;
        setTyping({ threadId, userId }).catch(() => {});
      }
    },
    [userId, threadId, setTyping]
  );

  const onSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || !userId || sending) return;
    setSending(true);
    setDraft('');
    const reply = replyTo;
    const edit = editing;
    setReplyTo(null);
    setEditing(null);
    try {
      if (edit) {
        await editMsg({ messageId: edit.id, userId, text });
      } else {
        await send({ threadId, senderId: userId, senderName, text, replyToId: reply?.id });
      }
    } catch {
      setDraft(text); // restore on failure so nothing is lost
      Alert.alert('Xatolik', 'Xabar yuborilmadi. Qayta urinib koʻring.');
    } finally {
      setSending(false);
    }
  }, [draft, userId, sending, replyTo, editing, editMsg, send, threadId, senderName]);

  const attachImage = useCallback(async () => {
    if (!userId || sending) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (res.canceled || !res.assets[0]) return;
    setSending(true);
    try {
      const url = await generateUploadUrl();
      const storageId = await uploadToConvex(url, res.assets[0].uri);
      if (storageId) {
        await send({ threadId, senderId: userId, senderName, text: '', imageId: storageId as Id<'_storage'> });
      } else {
        Alert.alert('Xatolik', 'Rasm yuborilmadi.');
      }
    } catch {
      Alert.alert('Xatolik', 'Rasm yuborilmadi.');
    } finally {
      setSending(false);
    }
  }, [userId, sending, generateUploadUrl, send, threadId, senderName]);

  const startRecording = useCallback(async () => {
    if (!userId || sending || recorderState.isRecording) return;
    if (!hasExpoAudio) {
      Alert.alert('Audio moduli kerak', 'Ovozli xabar uchun ilovani qayta build qilib oÊ»rnating.');
      return;
    }
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Ruxsat kerak', 'Ovozli xabar yozish uchun mikrofonga ruxsat bering.');
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  }, [userId, sending, recorderState.isRecording, recorder]);

  const cancelRecording = useCallback(async () => {
    if (!recorderState.isRecording) return;
    await recorder.stop();
  }, [recorderState.isRecording, recorder]);

  const stopAndSendRecording = useCallback(async () => {
    if (!userId || !recorderState.isRecording) return;
    const durationSec = recorder.currentTime;
    await recorder.stop();
    const uri = recorder.uri;
    if (!uri || durationSec < 1) return;
    setSending(true);
    try {
      const url = await generateUploadUrl();
      const storageId = await uploadToConvex(url, uri, 'audio/m4a');
      if (storageId) {
        await send({
          threadId,
          senderId: userId,
          senderName,
          text: '',
          audioId: storageId as Id<'_storage'>,
          audioDuration: durationSec,
        });
      } else {
        Alert.alert('Xatolik', 'Ovozli xabar yuborilmadi.');
      }
    } catch {
      Alert.alert('Xatolik', 'Ovozli xabar yuborilmadi.');
    } finally {
      setSending(false);
    }
  }, [userId, recorderState.isRecording, recorder, generateUploadUrl, send, threadId, senderName]);

  const startVideoCall = useCallback(() => {
    if (!callTarget) return;
    router.push({
      pathname: '/call/[id]',
      params: { id: 'new', role: 'caller', threadId, calleeId: callTarget, calleeName: otherName },
    } as unknown as Href);
  }, [callTarget, threadId, otherName, router]);

  const onReact = useCallback(
    (messageId: Id<'messages'>, emoji: string) => {
      if (!userId) return;
      react({ messageId, userId, emoji }).catch(() => {});
    },
    [userId, react]
  );

  const startReply = (m: Msg) => {
    setActionMsg(null);
    setEditing(null);
    setReplyTo({ id: m._id, name: m.senderName, text: m.deletedAt ? 'xabar' : m.text || '📷 Rasm' });
  };
  const startEdit = (m: Msg) => {
    setActionMsg(null);
    setReplyTo(null);
    setEditing({ id: m._id });
    setDraft(m.text);
  };
  const doDelete = (m: Msg) => {
    setActionMsg(null);
    if (userId) deleteMsg({ messageId: m._id, userId }).catch(() => {});
  };

  const submitSellerRating = async () => {
    if (!sellerUserId) return;
    if (!userId) {
      setRatingOpen(false);
      return router.push('/login');
    }
    try {
      await submitReview({
        sellerId: sellerUserId,
        authorId: userId,
        authorName: senderName,
        rating: stars,
        text: reviewText.trim(),
      });
      setRatingOpen(false);
      setReviewText('');
      setStars(5);
      Alert.alert('Rahmat', 'Bahoyingiz sotuvchi profiliga qoʻshildi.');
    } catch {
      Alert.alert('Xatolik', 'Baho yuborilmadi. Qayta urinib koʻring.');
    }
  };

  const submitSellerReport = async (reason: string) => {
    if (!userId) {
      setReportOpen(false);
      return router.push('/login');
    }
    try {
      await reportSeller({ sellerId: sellerUserId, sellerName: otherName, reason, reporter: senderName });
      setReportOpen(false);
      Alert.alert('Yuborildi', 'Sotuvchi boʻyicha shikoyatingiz qabul qilindi.');
    } catch {
      Alert.alert('Xatolik', 'Shikoyat yuborilmadi. Qayta urinib koʻring.');
    }
  };

  const renderItem = ({ item }: { item: Msg }) => {
    const mine = !!userId && item.senderId === userId;
    const deleted = !!item.deletedAt;
    const read = mine ? item.createdAt <= otherLastReadAt : false;
    const reacts = groupReactions(item.reactions);
    return (
      <Pressable
        onLongPress={() => !deleted && setActionMsg(item)}
        delayLongPress={250}
        className={`px-3 py-1 ${mine ? 'items-end' : 'items-start'}`}
      >
        <View className="max-w-[80%] rounded-2xl px-3.5 py-2.5" style={{ backgroundColor: mine ? BRAND_BLUE : '#EAEAEC' }}>
          {item.replyPreview && !deleted ? (
            <View
              className="mb-1.5 rounded-lg border-l-2 px-2 py-1"
              style={{ borderColor: mine ? '#ffffffAA' : BRAND_BLUE, backgroundColor: mine ? '#ffffff22' : '#00000008' }}
            >
              <AppText className="text-xs font-semibold" style={{ color: mine ? '#fff' : BRAND_BLUE }} numberOfLines={1}>
                {item.replyPreview.name}
              </AppText>
              <AppText className="text-xs" style={{ color: mine ? '#ffffffDD' : '#555' }} numberOfLines={1}>
                {item.replyPreview.text}
              </AppText>
            </View>
          ) : null}
          {item.imageUrl && !deleted ? (
            <Image
              source={{ uri: item.imageUrl }}
              contentFit="cover"
              style={{ width: 200, height: 200, borderRadius: 12, marginBottom: item.text ? 6 : 0 }}
            />
          ) : null}
          {item.audioUrl && !deleted ? (
            <VoiceBubble uri={item.audioUrl} duration={item.audioDuration ?? 0} mine={mine} />
          ) : null}
          {deleted ? (
            <AppText className="text-base italic" style={{ color: mine ? '#ffffffCC' : '#888' }}>
              Xabar oʻchirildi
            </AppText>
          ) : item.text ? (
            <AppText className="text-base" style={{ color: mine ? '#fff' : '#111' }}>
              {item.text}
            </AppText>
          ) : null}
          <View className="mt-0.5 flex-row items-center justify-end">
            {item.editedAt && !deleted ? (
              <AppText className="mr-1 text-[11px]" style={{ color: mine ? '#ffffffAA' : '#999' }}>
                tahrirlandi
              </AppText>
            ) : null}
            <AppText className="text-[11px]" style={{ color: mine ? '#ffffffCC' : '#999' }}>
              {clock(item.createdAt)}
            </AppText>
            {mine ? (
              <Ionicons
                name={read ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={read ? '#BFE3FF' : '#ffffffCC'}
                style={{ marginLeft: 3 }}
              />
            ) : null}
          </View>
        </View>
        {reacts.length > 0 ? (
          <View className={`mt-1 flex-row flex-wrap gap-1 ${mine ? 'justify-end' : 'justify-start'}`}>
            {reacts.map(([emoji, count]) => (
              <Pressable
                key={emoji}
                onPress={() => onReact(item._id, emoji)}
                className="flex-row items-center rounded-full border border-border bg-surface px-2 py-0.5"
              >
                <AppText className="text-sm">{emoji}</AppText>
                {count > 1 ? <AppText className="ml-1 text-xs text-muted">{count}</AppText> : null}
              </Pressable>
            ))}
          </View>
        ) : null}
      </Pressable>
    );
  };

  const actionIsMine = !!actionMsg && !!userId && actionMsg.senderId === userId;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: top }}>
      {/* Header */}
      <View className="flex-row items-center border-b border-border px-2 py-2">
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/chat'))}
          hitSlop={10}
          className="h-9 w-9 items-center justify-center"
        >
          <Ionicons name="arrow-back" size={24} color={BRAND_BLUE} />
        </Pressable>
        <View className="mr-2 h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: BRAND_BLUE }}>
          <AppText className="font-semibold text-base text-white">{otherName.charAt(0).toUpperCase()}</AppText>
        </View>
        <View className="flex-1">
          <AppText className="font-semibold text-base text-foreground" numberOfLines={1}>
            {otherName}
          </AppText>
          {info ? (
            <AppText className="text-xs" style={{ color: info.otherTyping || info.otherOnline ? BRAND_BLUE : '#9ca3af' }}>
              {info.otherTyping ? 'yozmoqda…' : info.otherOnline ? 'onlayn' : 'oflayn'}
            </AppText>
          ) : null}
        </View>
        {canCall ? (
          <Pressable onPress={startVideoCall} hitSlop={10} className="h-9 w-9 items-center justify-center">
            <Ionicons name="videocam" size={23} color={BRAND_BLUE} />
          </Pressable>
        ) : null}
        {canReviewSeller ? (
          <>
            <Pressable onPress={() => setRatingOpen(true)} hitSlop={10} className="h-9 w-9 items-center justify-center">
              <Ionicons name="star-outline" size={23} color={BRAND_BLUE} />
            </Pressable>
            <Pressable onPress={() => setReportOpen(true)} hitSlop={10} className="h-9 w-9 items-center justify-center">
              <Ionicons name="flag-outline" size={22} color="#DC2626" />
            </Pressable>
          </>
        ) : null}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={headerHeight}
      >
        {!messages ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={BRAND_BLUE} />
          </View>
        ) : (
          <FlatList
            data={data}
            inverted
            keyExtractor={(m) => m._id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingVertical: 8, flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={info?.otherTyping ? <TypingBubble /> : null}
            ListFooterComponent={
              canReviewSeller ? (
                <View>
                  <View className="px-3 pb-2">
                    <SafetyBanner compact />
                  </View>
                  <View className="px-3">
                    <DealSafetyTips compact />
                  </View>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center px-8">
                <Ionicons name="chatbubble-ellipses-outline" size={40} color="#cbd5e1" />
                <AppText className="mt-3 text-center text-base text-muted">Suhbatni boshlang. Xushmuomala boʻling 🤝</AppText>
              </View>
            }
          />
        )}

        {/* Reply / edit preview */}
        {replyTo || editing ? (
          <View className="flex-row items-center border-t border-border bg-surface px-3 py-2">
            <Ionicons name={editing ? 'create-outline' : 'arrow-undo'} size={18} color={BRAND_BLUE} />
            <View className="ml-2 flex-1">
              <AppText className="text-xs font-semibold" style={{ color: BRAND_BLUE }}>
                {editing ? 'Xabarni tahrirlash' : `Javob: ${replyTo?.name}`}
              </AppText>
              {replyTo ? (
                <AppText className="text-xs text-muted" numberOfLines={1}>
                  {replyTo.text}
                </AppText>
              ) : null}
            </View>
            <Pressable
              hitSlop={10}
              onPress={() => {
                setReplyTo(null);
                setEditing(null);
                if (editing) setDraft('');
              }}
            >
              <Ionicons name="close" size={20} color="#9ca3af" />
            </Pressable>
          </View>
        ) : null}

        <SuspiciousMessageWarning visible={suspiciousDraft} />

        {/* Input bar */}
        {recorderState.isRecording ? (
          <View
            className="flex-row items-center border-t border-border px-3 pt-2"
            style={{ paddingBottom: Math.max(bottom, 8) }}
          >
            <Pressable
              onPress={cancelRecording}
              hitSlop={8}
              className="mr-2 h-11 w-11 items-center justify-center rounded-full"
              style={{ backgroundColor: '#EAEAEC' }}
            >
              <Ionicons name="trash-outline" size={20} color="#DC2626" />
            </Pressable>
            <View className="mr-2 flex-1 flex-row items-center rounded-2xl border border-border bg-surface px-4 py-3">
              <View className="mr-2 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#DC2626' }} />
              <AppText className="text-base text-foreground">
                Yozilmoqda… {fmtDuration(recorderState.durationMillis / 1000)}
              </AppText>
            </View>
            <Pressable
              onPress={stopAndSendRecording}
              disabled={sending}
              className="h-11 w-11 items-center justify-center rounded-full active:opacity-80"
              style={{ backgroundColor: BRAND_BLUE }}
            >
              <Ionicons name="send" size={19} color="#fff" />
            </Pressable>
          </View>
        ) : (
          <View className="flex-row items-end border-t border-border px-3 pt-2" style={{ paddingBottom: Math.max(bottom, 8) }}>
            {!editing ? (
              <Pressable onPress={attachImage} disabled={sending} hitSlop={6} className="mb-1.5 mr-1 h-10 w-9 items-center justify-center">
                <Ionicons name="image-outline" size={24} color={BRAND_BLUE} />
              </Pressable>
            ) : null}
            <View className="mr-2 max-h-28 flex-1 justify-center rounded-2xl border border-border bg-surface px-4 py-1">
              <TextInput
                value={draft}
                onChangeText={onChangeDraft}
                placeholder="Xabar yozing…"
                placeholderTextColor="#9ca3af"
                multiline
                className="text-base text-foreground"
                style={{ fontFamily: 'Inter-Regular', paddingTop: 8, paddingBottom: 8, maxHeight: 100 }}
              />
            </View>
            {!editing && !draft.trim() ? (
              <Pressable
                onPress={startRecording}
                disabled={sending}
                className="h-11 w-11 items-center justify-center rounded-full active:opacity-80"
                style={{ backgroundColor: BRAND_BLUE }}
              >
                <Ionicons name="mic" size={20} color="#fff" />
              </Pressable>
            ) : (
              <Pressable
                onPress={onSend}
                disabled={!draft.trim() || sending}
                className="h-11 w-11 items-center justify-center rounded-full active:opacity-80"
                style={{ backgroundColor: draft.trim() && !sending ? BRAND_BLUE : '#cbd5e1' }}
              >
                <Ionicons name={editing ? 'checkmark' : 'send'} size={19} color="#fff" />
              </Pressable>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Long-press action sheet: react / reply / edit / delete */}
      <Modal visible={!!actionMsg} transparent animationType="fade" onRequestClose={() => setActionMsg(null)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setActionMsg(null)}>
          <Pressable className="rounded-t-3xl bg-background px-4 pb-8 pt-4" onPress={() => {}}>
            {/* Reaction row */}
            <View className="mb-3 flex-row justify-around rounded-2xl bg-surface px-2 py-3">
              {REACTIONS.map((e) => (
                <Pressable
                  key={e}
                  hitSlop={6}
                  onPress={() => {
                    if (actionMsg) onReact(actionMsg._id, e);
                    setActionMsg(null);
                  }}
                  className="active:opacity-60"
                >
                  <AppText className="text-3xl">{e}</AppText>
                </Pressable>
              ))}
            </View>
            <ActionRow icon="arrow-undo" label="Javob berish" onPress={() => actionMsg && startReply(actionMsg)} />
            {actionIsMine && actionMsg?.text ? (
              <ActionRow icon="create-outline" label="Tahrirlash" onPress={() => actionMsg && startEdit(actionMsg)} />
            ) : null}
            {actionIsMine ? (
              <ActionRow icon="trash-outline" label="Oʻchirish" danger onPress={() => actionMsg && doDelete(actionMsg)} />
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <RatingPromptSheet
        open={ratingOpen}
        sellerName={otherName}
        stars={stars}
        text={reviewText}
        onStars={setStars}
        onText={setReviewText}
        onClose={() => setRatingOpen(false)}
        onSubmit={submitSellerRating}
      />

      <Modal visible={reportOpen} transparent animationType="slide" onRequestClose={() => setReportOpen(false)}>
        <Pressable className="flex-1 bg-black/40" onPress={() => setReportOpen(false)} />
        <View className="rounded-t-3xl bg-background px-5 pb-8 pt-5">
          <View className="mb-3 flex-row items-center justify-between">
            <AppText className="font-bold text-xl text-foreground">Sotuvchidan shikoyat</AppText>
            <Pressable onPress={() => setReportOpen(false)} hitSlop={10}>
              <Ionicons name="close" size={26} color="#9ca3af" />
            </Pressable>
          </View>
          <AppText className="mb-4 text-base text-muted">Nima sababdan bu sotuvchini tekshirishimiz kerak?</AppText>
          {SELLER_REPORT_REASONS.map((r) => (
            <Pressable
              key={r}
              onPress={() => submitSellerReport(r)}
              className="flex-row items-center justify-between border-b border-border py-4 active:opacity-60"
            >
              <AppText className="text-lg text-foreground">{r}</AppText>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </Pressable>
          ))}
        </View>
      </Modal>
    </View>
  );
}

function ActionRow({
  icon,
  label,
  danger,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center rounded-xl px-3 py-3.5 active:bg-surface-secondary">
      <Ionicons name={icon} size={22} color={danger ? '#DC2626' : BRAND_BLUE} />
      <AppText className="ml-3 text-lg" style={{ color: danger ? '#DC2626' : undefined }}>
        {label}
      </AppText>
    </Pressable>
  );
}
