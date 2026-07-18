import { Ionicons } from '@expo/vector-icons';
import { api } from '@halolmia/backend/convex/_generated/api';
import type { Id } from '@halolmia/backend/convex/_generated/dataModel';
import {
  mediaDevices,
  MediaStream,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCView,
} from '@stream-io/react-native-webrtc';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/app-text';
import { BRAND_BLUE } from '../../constants/theme';
import { useAuth } from '../../lib/auth';
import { setForceSpeakerphoneOn, startInCall, stopInCall } from '../../lib/incall-safe';
import { CALL_VIDEO_CONSTRAINTS, getRtcConfig } from '../../lib/webrtc';

type CallStatus = 'connecting' | 'ringing' | 'connected' | 'reconnecting' | 'ended';

/** mm:ss call timer. */
function fmtElapsed(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${`${s % 60}`.padStart(2, '0')}`;
}

export default function CallScreen() {
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();
  const { userId, user } = useAuth();
  const myName = user?.name ?? user?.phone ?? 'Foydalanuvchi';
  const params = useLocalSearchParams<{
    id: string;
    role: 'caller' | 'callee';
    threadId?: string;
    calleeId?: string;
    calleeName?: string;
  }>();
  const isCaller = params.role === 'caller';

  const [callId, setCallId] = useState<Id<'calls'> | null>(
    params.id && params.id !== 'new' ? (params.id as Id<'calls'>) : null
  );
  const [status, setStatus] = useState<CallStatus>('connecting');
  const [remoteStreamUrl, setRemoteStreamUrl] = useState<string | null>(null);
  const [localStreamUrl, setLocalStreamUrl] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [frontCam, setFrontCam] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callIdRef = useRef<Id<'calls'> | null>(callId);
  const pendingLocalCandidatesRef = useRef<string[]>([]);
  const pendingRemoteCandidatesRef = useRef<string[]>([]);
  const appliedCandidatesRef = useRef(0);
  const remoteDescSetRef = useRef(false);
  const startedRef = useRef(false);
  const connectStartRef = useRef(0);

  const startCall = useMutation(api.calls.start);
  const answerCall = useMutation(api.calls.answer);
  const declineCall = useMutation(api.calls.decline);
  const endCall = useMutation(api.calls.end);
  const addCandidate = useMutation(api.calls.addCandidate);
  const generateIceServers = useAction(api.cloudflareTurn.generateIceServers);

  const setActiveCallId = useCallback((nextCallId: Id<'calls'>) => {
    callIdRef.current = nextCallId;
    setCallId(nextCallId);
  }, []);

  const sendLocalCandidate = useCallback(
    async (candidate: string, targetCallId = callIdRef.current) => {
      if (!userId) return;
      if (!targetCallId) {
        pendingLocalCandidatesRef.current.push(candidate);
        return;
      }
      await addCandidate({ callId: targetCallId, senderId: userId, candidate }).catch(() => {});
    },
    [addCandidate, userId]
  );

  const flushLocalCandidates = useCallback(
    async (targetCallId: Id<'calls'>) => {
      const pending = pendingLocalCandidatesRef.current.splice(0);
      await Promise.all(pending.map((candidate) => sendLocalCandidate(candidate, targetCallId)));
    },
    [sendLocalCandidate]
  );

  const applyRemoteCandidate = useCallback((candidate: string) => {
    const pc = pcRef.current;
    if (!pc || !remoteDescSetRef.current) {
      pendingRemoteCandidatesRef.current.push(candidate);
      return;
    }
    pc.addIceCandidate(new RTCIceCandidate(JSON.parse(candidate))).catch(() => {});
  }, []);

  const flushRemoteCandidates = useCallback(() => {
    const pending = pendingRemoteCandidatesRef.current.splice(0);
    pending.forEach(applyRemoteCandidate);
  }, [applyRemoteCandidate]);

  const call = useQuery(api.calls.get, callId ? { callId } : 'skip');
  const otherUserId = isCaller ? call?.calleeId : call?.callerId;
  const remoteCandidates = useQuery(
    api.calls.candidatesFrom,
    callId && otherUserId ? { callId, otherUserId } : 'skip'
  );
  const otherName = isCaller ? (params.calleeName ?? call?.calleeName ?? '') : (call?.callerName ?? '');

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    stopInCall();
  }, []);

  const hangUp = useCallback(
    async (reason?: 'decline') => {
      setStatus('ended');
      cleanup();
      const activeCallId = callIdRef.current;
      if (activeCallId) {
        if (reason === 'decline') await declineCall({ callId: activeCallId }).catch(() => {});
        else await endCall({ callId: activeCallId }).catch(() => {});
      }
      router.canGoBack() ? router.back() : router.replace('/(tabs)/chat');
    },
    [cleanup, declineCall, endCall, router]
  );

  // Build the peer connection + local media once, then either create an offer
  // (caller) or wait for the offer to arrive via the call doc (callee).
  useEffect(() => {
    if (startedRef.current || !userId) return;
    startedRef.current = true;

    (async () => {
      startInCall({ media: 'video' });
      const stream = (await mediaDevices.getUserMedia({
        audio: true,
        video: CALL_VIDEO_CONSTRAINTS,
      })) as MediaStream;
      localStreamRef.current = stream;
      setLocalStreamUrl(stream.toURL());

      const turn = await generateIceServers({ ttlSeconds: 86_400 }).catch(() => null);
      const pc = new RTCPeerConnection(getRtcConfig(turn?.iceServers));
      pcRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event: { streams: MediaStream[] }) => {
        if (event.streams[0]) setRemoteStreamUrl(event.streams[0].toURL());
      };
      pc.onicecandidate = (event: { candidate: unknown }) => {
        if (event.candidate) {
          sendLocalCandidate(JSON.stringify(event.candidate));
        }
      };
      pc.oniceconnectionstatechange = () => {
        const s = pc.iceConnectionState;
        if (s === 'connected' || s === 'completed') {
          connectStartRef.current = Date.now();
          setStatus('connected');
        } else if (s === 'disconnected') {
          setStatus('reconnecting');
        } else if (s === 'failed' || s === 'closed') {
          hangUp();
        }
      };

      if (isCaller) {
        setStatus('ringing');
        const offer = await pc.createOffer({});
        await pc.setLocalDescription(offer);
        const newCallId = await startCall({
          threadId: String(params.threadId),
          callerId: userId,
          callerName: myName,
          calleeId: params.calleeId as Id<'users'>,
          calleeName: String(params.calleeName ?? ''),
          offer: offer.sdp as string,
        });
        setActiveCallId(newCallId);
        await flushLocalCandidates(newCallId);
        // Give up if nobody answers.
        setTimeout(() => {
          if (!remoteDescSetRef.current) hangUp();
        }, 45_000);
      }
    })().catch(() => {
      Alert.alert('Xatolik', 'Kamera yoki mikrofonga ruxsat kerak.');
      router.back();
    });

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Callee: once the call doc (with the caller's offer) has loaded, answer it.
  useEffect(() => {
    if (isCaller || !call || !pcRef.current || remoteDescSetRef.current) return;
    remoteDescSetRef.current = true;
    (async () => {
      const pc = pcRef.current!;
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: call.offer }));
      const ans = await pc.createAnswer();
      await pc.setLocalDescription(ans);
      flushRemoteCandidates();
      if (callId) await answerCall({ callId, answer: ans.sdp as string });
    })();
  }, [isCaller, call, callId, answerCall, flushRemoteCandidates]);

  // Caller: once the callee answers, attach the remote description.
  useEffect(() => {
    if (!isCaller || !call?.answer || !pcRef.current || remoteDescSetRef.current) return;
    remoteDescSetRef.current = true;
    pcRef.current
      .setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: call.answer }))
      .then(flushRemoteCandidates)
      .catch(() => {});
  }, [isCaller, call?.answer, flushRemoteCandidates]);

  // Apply newly-trickled ICE candidates from the other side.
  useEffect(() => {
    if (!remoteCandidates || !pcRef.current) return;
    for (let i = appliedCandidatesRef.current; i < remoteCandidates.length; i++) {
      applyRemoteCandidate(remoteCandidates[i]);
    }
    appliedCandidatesRef.current = remoteCandidates.length;
  }, [remoteCandidates, applyRemoteCandidate]);

  // React to the other side declining/ending the call.
  useEffect(() => {
    if (!call) return;
    if (call.status === 'declined' || call.status === 'ended' || call.status === 'missed') {
      setStatus('ended');
      cleanup();
      router.canGoBack() ? router.back() : router.replace('/(tabs)/chat');
    }
  }, [call?.status, cleanup, router]);

  // Call timer once connected.
  useEffect(() => {
    if (status !== 'connected') return;
    const id = setInterval(() => setElapsed((Date.now() - connectStartRef.current) / 1000), 500);
    return () => clearInterval(id);
  }, [status]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
  }, [muted]);

  const toggleSpeaker = useCallback(() => {
    const next = !speakerOn;
    setSpeakerOn(next);
    setForceSpeakerphoneOn(next);
  }, [speakerOn]);

  const flipCamera = useCallback(() => {
    setFrontCam((f) => !f);
    const track = localStreamRef.current?.getVideoTracks()[0] as { _switchCamera?: () => void } | undefined;
    track?._switchCamera?.();
  }, []);

  const statusLabel =
    status === 'connecting'
      ? 'Ulanmoqda...'
      : status === 'ringing'
        ? 'Qoʻngʻiroq qilinmoqda...'
        : status === 'reconnecting'
          ? 'Qayta ulanmoqda...'
          : fmtElapsed(elapsed);

  return (
    <View className="flex-1" style={{ backgroundColor: '#0B0B0F' }}>
      {remoteStreamUrl ? (
        <RTCView streamURL={remoteStreamUrl} style={{ flex: 1 }} objectFit="cover" />
      ) : (
        <View className="flex-1 items-center justify-center">
          <View className="h-24 w-24 items-center justify-center rounded-full" style={{ backgroundColor: BRAND_BLUE }}>
            <AppText className="text-3xl font-bold text-white">{otherName.charAt(0).toUpperCase() || '?'}</AppText>
          </View>
          <AppText className="mt-4 text-xl font-semibold text-white">{otherName}</AppText>
          <AppText className="mt-1 text-base text-white/70">{statusLabel}</AppText>
        </View>
      )}

      {remoteStreamUrl ? (
        <View className="absolute left-4 right-4 flex-row items-center justify-between" style={{ top: top + 8 }}>
          <AppText className="text-base font-semibold text-white" style={{ textShadowRadius: 4, textShadowColor: '#000' }}>
            {otherName}
          </AppText>
          <AppText className="text-sm text-white/90" style={{ textShadowRadius: 4, textShadowColor: '#000' }}>
            {statusLabel}
          </AppText>
        </View>
      ) : null}

      {localStreamUrl ? (
        <View
          className="absolute overflow-hidden rounded-2xl"
          style={{ top: top + 8, right: 16, width: 100, height: 140, backgroundColor: '#000' }}
        >
          <RTCView streamURL={localStreamUrl} style={{ flex: 1 }} objectFit="cover" mirror={frontCam} />
        </View>
      ) : null}

      <View
        className="absolute left-0 right-0 flex-row items-center justify-center gap-5"
        style={{ bottom: bottom + 24 }}
      >
        <Pressable
          onPress={toggleMute}
          className="h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: muted ? '#fff' : '#ffffff30' }}
        >
          <Ionicons name={muted ? 'mic-off' : 'mic'} size={24} color={muted ? '#111' : '#fff'} />
        </Pressable>
        <Pressable
          onPress={() => hangUp()}
          className="h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: '#DC2626' }}
        >
          <Ionicons name="call" size={26} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
        </Pressable>
        <Pressable
          onPress={flipCamera}
          className="h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: '#ffffff30' }}
        >
          <Ionicons name="camera-reverse" size={24} color="#fff" />
        </Pressable>
        <Pressable
          onPress={toggleSpeaker}
          className="h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: speakerOn ? '#fff' : '#ffffff30' }}
        >
          <Ionicons name="volume-high" size={22} color={speakerOn ? '#111' : '#fff'} />
        </Pressable>
      </View>
    </View>
  );
}
