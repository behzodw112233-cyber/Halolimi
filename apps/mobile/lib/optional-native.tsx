import { useMemo } from 'react';
import { View, type ViewProps } from 'react-native';

type ExpoVideoModule = typeof import('expo-video');
type ExpoAudioModule = typeof import('expo-audio');

let ExpoVideo: ExpoVideoModule | null = null;
let ExpoAudio: ExpoAudioModule | null = null;

try {
  ExpoVideo = require('expo-video') as ExpoVideoModule;
} catch {
  ExpoVideo = null;
}

try {
  ExpoAudio = require('expo-audio') as ExpoAudioModule;
} catch {
  ExpoAudio = null;
}

export const hasExpoVideo = !!ExpoVideo;
export const hasExpoAudio = !!ExpoAudio;

const noopPlayer = {
  loop: false,
  play: () => {},
  pause: () => {},
  replay: () => {},
  seekTo: () => {},
};

export const useVideoPlayer = (ExpoVideo?.useVideoPlayer ??
  ((source: unknown, setup?: (player: typeof noopPlayer) => void) => {
    return useMemo(() => {
      const player = { ...noopPlayer };
      setup?.(player);
      return player;
    }, [source, setup]);
  })) as ExpoVideoModule['useVideoPlayer'];

export const VideoView = (ExpoVideo?.VideoView ??
  function MissingVideoView({ style }: ViewProps & { player?: unknown }) {
    return <View style={[{ backgroundColor: '#000' }, style]} />;
  }) as ExpoVideoModule['VideoView'];

const noopRecorder = {
  uri: null as string | null,
  currentTime: 0,
  prepareToRecordAsync: async () => {},
  record: () => {},
  stop: async () => {},
};

export const AudioModule = (ExpoAudio?.AudioModule ?? {
  requestRecordingPermissionsAsync: async () => ({
    granted: false,
    status: 'denied',
    canAskAgain: false,
    expires: 'never',
  }),
}) as ExpoAudioModule['AudioModule'];

export const RecordingPresets = (ExpoAudio?.RecordingPresets ?? {
  HIGH_QUALITY: {},
}) as ExpoAudioModule['RecordingPresets'];

export const setAudioModeAsync = (ExpoAudio?.setAudioModeAsync ??
  (async () => {})) as ExpoAudioModule['setAudioModeAsync'];

export const useAudioPlayer = (ExpoAudio?.useAudioPlayer ??
  ((uri: string) => {
    return useMemo(
      () => ({
        play: () => {},
        pause: () => {},
        seekTo: () => {},
      }),
      [uri]
    );
  })) as ExpoAudioModule['useAudioPlayer'];

export const useAudioPlayerStatus = (ExpoAudio?.useAudioPlayerStatus ??
  (() => ({
    duration: 0,
    currentTime: 0,
    playing: false,
    didJustFinish: false,
  }))) as ExpoAudioModule['useAudioPlayerStatus'];

export const useAudioRecorder = (ExpoAudio?.useAudioRecorder ??
  (() => noopRecorder)) as ExpoAudioModule['useAudioRecorder'];

export const useAudioRecorderState = (ExpoAudio?.useAudioRecorderState ??
  (() => ({ isRecording: false }))) as ExpoAudioModule['useAudioRecorderState'];
