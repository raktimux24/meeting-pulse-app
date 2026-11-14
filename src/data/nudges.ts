import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { MOOD_CONFIG } from '@/domain/constants';
import { NUDGE_HORIZON_HOURS, NUDGE_MOODS, NUDGE_PREFIX, planNudges } from '@/domain/nudges';
import type { NudgePrefs } from '@/domain/types';

import { readCalendarSlotsSilently, requestCalendarAccess } from './calendar-assist';

/** Category ids must not contain ":" or "-". */
export const NUDGE_CATEGORY = 'meetingpulse_checkin';
const NUDGE_CHANNEL = 'meeting-pulse-checkins';

export function nudgesSupported(): boolean {
  return Platform.OS !== 'web';
}

async function ensureCategory(): Promise<void> {
  await Notifications.setNotificationCategoryAsync(
    NUDGE_CATEGORY,
    NUDGE_MOODS.map((mood) => ({
      identifier: `mood_${mood}`,
      buttonTitle: MOOD_CONFIG[mood].label,
      // iOS only runs app code for an action when it opens the app, so each one does.
      options: { opensAppToForeground: true },
    })),
  );
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(NUDGE_CHANNEL, {
      name: 'After-meeting check-ins',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

async function cancelNudges(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.identifier.startsWith(NUDGE_PREFIX))
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier).catch(() => undefined)),
  );
}

/**
 * Asks for the permissions check-ins need: calendar (to know when meetings end) and notifications.
 * Throws with a readable message when either is refused.
 */
export async function enableNudgePermissions(): Promise<void> {
  if (!nudgesSupported()) throw new Error('After-meeting check-ins are available in the iOS and Android apps.');
  if (!(await requestCalendarAccess())) {
    throw new Error('Calendar access is off. Check-ins need meeting times to know when a meeting ends.');
  }
  const permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') throw new Error('Notifications are off. Enable them to get after-meeting check-ins.');
}

/**
 * Replaces all pending check-ins with ones planned from the next two days of calendar times.
 * Runs quietly: if calendar or notification access is missing it only clears old check-ins.
 * Returns how many check-ins are now scheduled.
 */
export async function syncNudges(prefs: NudgePrefs, now = new Date()): Promise<number> {
  if (!nudgesSupported()) return 0;
  await cancelNudges();
  if (!prefs.enabled) return 0;

  const notificationPermission = await Notifications.getPermissionsAsync();
  if (notificationPermission.status !== 'granted') return 0;
  const slots = await readCalendarSlotsSilently(new Date(now.getTime() - 12 * 3_600_000), new Date(now.getTime() + NUDGE_HORIZON_HOURS * 3_600_000));
  if (!slots) return 0;

  await ensureCategory();
  const planned = planNudges(slots, now, prefs);
  for (const nudge of planned) {
    await Notifications.scheduleNotificationAsync({
      identifier: nudge.identifier,
      content: {
        title: 'Meeting Pulse',
        body: nudge.body,
        sound: false,
        categoryIdentifier: NUDGE_CATEGORY,
        data: { url: '/quick-pulse', kind: 'nudge', startIso: nudge.startIso, durationMinutes: nudge.durationMinutes },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: nudge.fireAt,
        ...(Platform.OS === 'android' ? { channelId: NUDGE_CHANNEL } : {}),
      },
    });
  }
  return planned.length;
}

export type NudgeResponse = {
  startIso: string | null;
  durationMinutes: number | null;
  actionIdentifier: string;
};

/** Pulls the meeting time out of a tapped check-in, or null if the response is not a check-in. */
export function readNudgeResponse(response: Notifications.NotificationResponse): NudgeResponse | null {
  const data = response.notification.request.content.data as Record<string, unknown> | undefined;
  if (data?.kind !== 'nudge') return null;
  const startIso = typeof data.startIso === 'string' ? data.startIso : null;
  const durationMinutes = typeof data.durationMinutes === 'number' ? data.durationMinutes : null;
  return { startIso, durationMinutes, actionIdentifier: response.actionIdentifier };
}
