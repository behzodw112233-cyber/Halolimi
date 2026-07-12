import InCallManager from 'react-native-incall-manager';

/**
 * react-native-incall-manager doesn't ship a New Architecture (Fabric/TurboModule)
 * spec, so under this app's New Architecture build `NativeModules.InCallManager` is
 * undefined and every call throws "Cannot read property 'x' of null". These calls
 * are just audio-routing nice-to-haves (speaker on for video, restore on hangup),
 * so fail silently instead of crashing the call screen.
 */
function safe(fn: () => void) {
  try {
    fn();
  } catch {
    // native module unavailable — call still works, just without speaker routing
  }
}

export const startInCall = (setup?: Parameters<typeof InCallManager.start>[0]) =>
  safe(() => InCallManager.start(setup));

export const stopInCall = () => safe(() => InCallManager.stop());

export const setForceSpeakerphoneOn = (flag: boolean) =>
  safe(() => InCallManager.setForceSpeakerphoneOn(flag));
