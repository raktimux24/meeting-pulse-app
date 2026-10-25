import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type CalendarSlot = {
  startIso: string;
  durationMinutes: number;
};

type CalendarEventShape = { startDate: string | Date; endDate: string | Date; allDay?: boolean };

export function calendarAssistAvailable(): boolean {
  return Platform.OS !== 'web' && Constants.appOwnership !== 'expo';
}

export function sanitizeCalendarEvents(events: CalendarEventShape[]): CalendarSlot[] {
  const seen = new Set<string>();
  return events.flatMap((event) => {
    if (event.allDay) return [];
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

export async function loadCalendarSlots(start: Date, end: Date): Promise<{ permission: 'granted' | 'denied'; slots: CalendarSlot[] }> {
  if (!calendarAssistAvailable()) return { permission: 'denied', slots: [] };
  const Calendar = await import('expo-calendar');
  const permission = await Calendar.requestCalendarPermissionsAsync();
  if (permission.status !== 'granted') return { permission: 'denied', slots: [] };

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const events = await Calendar.getEventsAsync(calendars.map((calendar) => calendar.id), start, end);
  return { permission: 'granted', slots: sanitizeCalendarEvents(events) };
}
