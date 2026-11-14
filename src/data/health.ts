import native from '../../modules/meeting-pulse-native';
import { stateOfMindFor } from '@/domain/health';
import type { Mood } from '@/domain/types';

/** True on iOS 18+ devices with Apple Health, in a build that includes the native module. */
export function healthAvailable(): boolean {
  try {
    return Boolean(native?.isHealthAvailable());
  } catch {
    return false;
  }
}

/** Shows Apple's permission sheet. Resolves true when Meeting Pulse may save State of Mind entries. */
export async function requestHealthAccess(): Promise<boolean> {
  if (!native || !healthAvailable()) return false;
  return native.requestHealthAccess();
}

/** Saves one mood as a State of Mind entry tagged "Work". Never throws: Health is optional. */
export async function saveMoodToHealth(mood: Mood, occurredAt: string, durationMinutes?: number | null): Promise<boolean> {
  if (!native || !healthAvailable()) return false;
  try {
    if (!native.healthSharingAuthorized()) return false;
    const sample = stateOfMindFor(mood, occurredAt, durationMinutes ?? 0);
    return await native.saveStateOfMind(sample.valence, sample.label, new Date(sample.dateIso).getTime());
  } catch {
    return false;
  }
}

/** The screen a Siri or Shortcuts action asked for, read once. */
export function consumePendingRoute(): string | null {
  try {
    return native?.consumePendingRoute() ?? null;
  } catch {
    return null;
  }
}

/** Calls `listener` whenever a Siri or Shortcuts action asks the running app for a screen. */
export function addRouteRequestListener(listener: () => void): { remove(): void } {
  try {
    return native?.addListener('onRouteRequested', listener) ?? { remove: () => undefined };
  } catch {
    return { remove: () => undefined };
  }
}
