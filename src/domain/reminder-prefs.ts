import type { ReminderPrefs } from './types';

export const DEFAULT_REMINDER: ReminderPrefs = { enabled: false, hour: 18, minute: 0 };

export function parseReminderPrefs(raw: string | null): ReminderPrefs {
  if (!raw) return DEFAULT_REMINDER;
  try {
    const parsed = JSON.parse(raw) as ReminderPrefs;
    return {
      enabled: Boolean(parsed.enabled),
      hour: Number.isInteger(parsed.hour) ? parsed.hour : 18,
      minute: Number.isInteger(parsed.minute) ? parsed.minute : 0,
    };
  } catch {
    return DEFAULT_REMINDER;
  }
}
