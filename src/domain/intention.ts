import { isSameWeek } from 'date-fns';

import type { WeeklyIntention } from './types';

export function parseIntention(raw: string | null): WeeklyIntention | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as WeeklyIntention;
    if (typeof parsed.text !== 'string' || typeof parsed.weekStartIso !== 'string') return null;
    return {
      text: parsed.text,
      weekStartIso: parsed.weekStartIso,
      tried: Boolean(parsed.tried),
    };
  } catch {
    return null;
  }
}

export function intentionForWeek(intention: WeeklyIntention | null, weekStart: Date, weekStartsOn: 0 | 1): WeeklyIntention | null {
  if (!intention) return null;
  return isSameWeek(new Date(intention.weekStartIso), weekStart, { weekStartsOn }) ? intention : null;
}
