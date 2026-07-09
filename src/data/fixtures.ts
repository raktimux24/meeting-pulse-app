import { addDays, setHours, startOfWeek, subWeeks } from 'date-fns';

import type { MeetingInput } from '@/domain/types';

export function makeDemoMeetings(): MeetingInput[] {
  const monday = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
  const at = (day: number, hour: number) => setHours(addDays(monday, day), hour).toISOString();

  return [
    { title: 'Product standup', occurredAt: at(0, 10), durationMinutes: 15, meetingType: 'standup', peopleCount: 6, note: '', mood: 'neutral', reasonIds: [] },
    { title: 'Design review', occurredAt: at(0, 15), durationMinutes: 45, meetingType: 'review', peopleCount: 5, note: '', mood: 'clear', reasonIds: ['clear-outcome', 'good-facilitation'] },
    { title: 'Weekly status', occurredAt: at(1, 11), durationMinutes: 60, meetingType: 'status-update', peopleCount: 12, note: '', mood: 'drained', reasonIds: ['no-decision', 'could-have-been-async', 'too-many-people'] },
    { title: 'Manager 1:1', occurredAt: at(1, 16), durationMinutes: 30, meetingType: 'one-on-one', peopleCount: 2, note: '', mood: 'aligned', reasonIds: ['strong-alignment', 'clear-outcome'] },
    { title: 'Roadmap planning', occurredAt: at(2, 14), durationMinutes: 90, meetingType: 'planning', peopleCount: 9, note: '', mood: 'frustrated', reasonIds: ['no-decision', 'unclear-ownership', 'too-long'] },
    { title: 'Client sync', occurredAt: at(3, 10), durationMinutes: 30, meetingType: 'client-call', peopleCount: 4, note: '', mood: 'energized', reasonIds: ['fast-decision', 'right-people'] },
    { title: 'Project update', occurredAt: at(3, 15), durationMinutes: 45, meetingType: 'status-update', peopleCount: 10, note: '', mood: 'drained', reasonIds: ['could-have-been-async', 'poor-context'] },
    { title: 'Research debrief', occurredAt: at(4, 11), durationMinutes: 30, meetingType: 'review', peopleCount: 4, note: '', mood: 'clear', reasonIds: ['useful-discussion', 'clear-outcome'] },
  ];
}
