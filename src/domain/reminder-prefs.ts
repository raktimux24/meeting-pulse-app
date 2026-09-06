import type { ReminderPrefs } from './types';

export const DEFAULT_REMINDER: ReminderPrefs = { enabled: false, hour: 18, minute: 0 };
export const REMINDER_HOURS = [17, 18, 19, 20] as const;

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function parseReminderPrefs(raw: string | null): ReminderPrefs {
  if (!raw) return DEFAULT_REMINDER;
  try {
    const parsed = JSON.parse(raw) as ReminderPrefs;
    return {
      enabled: Boolean(parsed.enabled),
      hour: clampInt(parsed.hour, DEFAULT_REMINDER.hour, 0, 23),
      minute: clampInt(parsed.minute, DEFAULT_REMINDER.minute, 0, 59),
    };
  } catch {
    return DEFAULT_REMINDER;
  }
}

export function formatReminderHour(hour: number): string {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve} ${suffix}`;
}
