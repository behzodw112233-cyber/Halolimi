export type IceServer = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

export type RtcConfig = {
  iceServers: IceServer[];
};

export const CALL_VIDEO_CONSTRAINTS = {
  facingMode: 'user',
  width: 640,
  height: 480,
  frameRate: 24,
};

export function getRtcConfig(iceServers?: IceServer[]): RtcConfig {
  if (iceServers?.length) {
    return { iceServers };
  }

  return {
    iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };
}
