import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type CalendarSlot = {
  startIso: string;
  durationMinutes: number;
};

type CalendarEventShape = { startDate: string | Date; endDate: string | Date; allDay?: boolean; title?: string | null };

/** Holds Meeting Pulse adds itself (resets and buffers) end with this; they are not meetings. */
const OWN_HOLD_SUFFIX = '· Meeting Pulse';

export function calendarAssistAvailable(): boolean {
  return Platform.OS !== 'web' && Constants.appOwnership !== 'expo';
}

export function sanitizeCalendarEvents(events: CalendarEventShape[]): CalendarSlot[] {
  const seen = new Set<string>();
  return events.flatMap((event) => {
    if (event.allDay) return [];
    // The title is only checked here and then dropped; it is never stored or returned.
    if (event.title?.trim().endsWith(OWN_HOLD_SUFFIX)) return [];
    const eventStart = new Date(event.startDate);
    const eventEnd = new Date(event.endDate);
    const durationMinutes = Math.round((eventEnd.getTime() - eventStart.getTime()) / 60_000);
    if (Number.isNaN(eventStart.getTime()) || durationMinutes < 5 || durationMinutes > 720) return [];
    const key = `${eventStart.toISOString()}::${durationMinutes}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ startIso: eventStart.toISOString(), durationMinutes }];
  }).sort((a, b) => new Date(a.startIso).getTime() - new Date(b.startIso).getTime());
}

// expo-calendar 57 throws from the old top-level async functions; the same API lives in expo-calendar/legacy.
export async function loadCalendarSlots(start: Date, end: Date): Promise<{ permission: 'granted' | 'denied'; slots: CalendarSlot[] }> {
  if (!calendarAssistAvailable()) return { permission: 'denied', slots: [] };
  const Calendar = await import('expo-calendar/legacy');
  const permission = await Calendar.requestCalendarPermissionsAsync();
  if (permission.status !== 'granted') return { permission: 'denied', slots: [] };

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const events = await Calendar.getEventsAsync(calendars.map((calendar) => calendar.id), start, end);
  return { permission: 'granted', slots: sanitizeCalendarEvents(events) };
}

/** Reads time slots only if calendar access was already granted; never shows a permission prompt. */
export async function readCalendarSlotsSilently(start: Date, end: Date): Promise<CalendarSlot[] | null> {
  if (!calendarAssistAvailable()) return null;
  const Calendar = await import('expo-calendar/legacy');
  const permission = await Calendar.getCalendarPermissionsAsync();
  if (permission.status !== 'granted') return null;
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const events = await Calendar.getEventsAsync(calendars.map((calendar) => calendar.id), start, end);
  return sanitizeCalendarEvents(events);
}

export async function requestCalendarAccess(): Promise<boolean> {
  if (!calendarAssistAvailable()) return false;
  const Calendar = await import('expo-calendar/legacy');
  const permission = await Calendar.requestCalendarPermissionsAsync();
  return permission.status === 'granted';
}

export const BUFFER_EVENT_TITLE = 'Buffer · Meeting Pulse';
export const RESET_EVENT_TITLE = 'Reset · Meeting Pulse';

async function writableCalendarId(): Promise<string> {
  const Calendar = await import('expo-calendar/legacy');
  if (Platform.OS === 'ios') {
    const fallback = await Calendar.getDefaultCalendarAsync().catch(() => null);
    if (fallback?.allowsModifications) return fallback.id;
  }
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = calendars.find((calendar) => calendar.allowsModifications && calendar.isPrimary)
    ?? calendars.find((calendar) => calendar.allowsModifications);
  if (!writable) throw new Error('No calendar on this device accepts new events.');
  return writable.id;
}

/** Adds "busy" holds to the user's default calendar. Returns how many were added. */
export async function addCalendarHolds(holds: { startIso: string; minutes: number; title: string; notes: string }[]): Promise<number> {
  if (!holds.length) return 0;
  if (!(await requestCalendarAccess())) throw new Error('Calendar access is off. Nothing was added.');
  const Calendar = await import('expo-calendar/legacy');
  const calendarId = await writableCalendarId();
  for (const hold of holds) {
    const startDate = new Date(hold.startIso);
    await Calendar.createEventAsync(calendarId, {
      title: hold.title,
      startDate,
      endDate: new Date(startDate.getTime() + hold.minutes * 60_000),
      notes: hold.notes,
      availability: Calendar.Availability.BUSY,
    });
  }
  return holds.length;
}
