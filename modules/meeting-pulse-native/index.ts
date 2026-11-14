import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

type MeetingPulseNativeModule = {
  isHealthAvailable(): boolean;
  requestHealthAccess(): Promise<boolean>;
  healthSharingAuthorized(): boolean;
  saveStateOfMind(valence: number, label: string, timestampMs: number): Promise<boolean>;
  consumePendingRoute(): string | null;
  /** Fires when a Siri or Shortcuts action asks the running app to show a screen. */
  addListener(eventName: 'onRouteRequested', listener: () => void): { remove(): void };
};

/** Null on Android, web, Expo Go and in tests: callers treat that as "not available". */
const native = Platform.OS === 'ios' ? requireOptionalNativeModule<MeetingPulseNativeModule>('MeetingPulseNative') : null;

export default native;
