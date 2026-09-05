import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import type { ReminderPrefs } from '@/domain/types';

export { DEFAULT_REMINDER, parseReminderPrefs } from '@/domain/reminder-prefs';

const REMINDER_CHANNEL = 'meeting-pulse-daily';

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

export async function syncDailyReminder(prefs: ReminderPrefs): Promise<void> {
  if (Platform.OS === 'web') {
    if (prefs.enabled) {
      throw new Error('Daily reminders are available in the iOS and Android apps.');
    }
    return;
  }

  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!prefs.enabled) return;

  const permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error('Notifications are off. Enable them to get a daily logging reminder.');
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL, {
      name: 'Daily reflection',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Meeting Pulse',
      body: 'Take 20 seconds to capture today’s meetings.',
      ...(Platform.OS === 'android' ? { channelId: REMINDER_CHANNEL } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: prefs.hour,
      minute: prefs.minute,
    },
  });
}
