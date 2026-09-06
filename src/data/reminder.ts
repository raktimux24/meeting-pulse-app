import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import type { ReminderPrefs } from '@/domain/types';

export { DEFAULT_REMINDER, parseReminderPrefs } from '@/domain/reminder-prefs';

const REMINDER_CHANNEL = 'meeting-pulse-daily';
export const REMINDER_IDENTIFIER = 'meeting-pulse-eod';
const TEST_IDENTIFIER = 'meeting-pulse-eod-test';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export function reminderSupported(): boolean {
  return Platform.OS !== 'web';
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL, {
    name: 'Daily reflection',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function syncDailyReminder(prefs: ReminderPrefs): Promise<void> {
  if (!reminderSupported()) {
    if (prefs.enabled) {
      throw new Error('Daily reminders are available in the iOS and Android apps.');
    }
    return;
  }

  await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIER).catch(() => undefined);
  if (!prefs.enabled) return;

  const permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error('Notifications are off. Enable them to get a daily logging reminder.');
  }

  await ensureAndroidChannel();

  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_IDENTIFIER,
    content: {
      title: 'Meeting Pulse',
      body: 'Take 20 seconds to capture today’s meetings.',
      sound: false,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: prefs.hour,
      minute: prefs.minute,
      ...(Platform.OS === 'android' ? { channelId: REMINDER_CHANNEL } : {}),
    },
  });
}

export async function sendTestReminder(): Promise<void> {
  if (!reminderSupported()) {
    throw new Error('Daily reminders are available in the iOS and Android apps.');
  }

  const permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error('Notifications are off. Enable them to preview the reminder.');
  }

  await ensureAndroidChannel();
  await Notifications.cancelScheduledNotificationAsync(TEST_IDENTIFIER).catch(() => undefined);
  await Notifications.scheduleNotificationAsync({
    identifier: TEST_IDENTIFIER,
    content: {
      title: 'Meeting Pulse',
      body: 'This is a test of your end-of-day reminder.',
      sound: false,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
      ...(Platform.OS === 'android' ? { channelId: REMINDER_CHANNEL } : {}),
    },
  });
}

export async function reminderIsScheduled(): Promise<boolean> {
  if (!reminderSupported()) return false;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.some((item) => item.identifier === REMINDER_IDENTIFIER);
}
