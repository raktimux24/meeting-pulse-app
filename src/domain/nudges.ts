import { format } from 'date-fns';

import type { Mood, NudgePrefs } from './types';

export const DEFAULT_NUDGES: NudgePrefs = { enabled: false, delayMinutes: 2 };
export const NUDGE_DELAYS = [0, 2, 5, 10] as const;
/** iOS keeps at most 64 pending local notifications per app; leave room for the daily reminder. */
export const MAX_NUDGES = 24;
/** How far ahead nudges are planned each time the app opens. */
export const NUDGE_HORIZON_HOURS = 48;
export const NUDGE_PREFIX = 'meeting-pulse-nudge';
/** The four moods offered as buttons on the notification (iOS shows up to four actions comfortably). */
export const NUDGE_MOODS: Mood[] = ['energized', 'clear', 'neutral', 'drained'];

export type NudgeSlot = { startIso: string; durationMinutes: number };

export type PlannedNudge = {
  identifier: string;
  fireAt: Date;
  startIso: string;
  durationMinutes: number;
  body: string;
};

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function parseNudgePrefs(raw: string | null): NudgePrefs {
  if (!raw) return DEFAULT_NUDGES;
  try {
    const parsed = JSON.parse(raw) as Partial<NudgePrefs>;
    return { enabled: Boolean(parsed.enabled), delayMinutes: clampInt(parsed.delayMinutes, DEFAULT_NUDGES.delayMinutes, 0, 30) };
  } catch {
    return DEFAULT_NUDGES;
  }
}

/** A stable identifier per calendar slot, so re-planning replaces rather than duplicates. */
export function nudgeIdentifier(slot: NudgeSlot): string {
  return `${NUDGE_PREFIX}:${new Date(slot.startIso).getTime()}:${slot.durationMinutes}`;
}

export function nudgeBody(slot: NudgeSlot): string {
  const start = new Date(slot.startIso);
  return `Your ${format(start, 'h:mm a')} meeting (${slot.durationMinutes} min) just ended. How did it land?`;
}

/**
 * Turns calendar time slots into end-of-meeting check-ins. Only times are used: no titles or attendees.
 * Slots that already ended, or that end beyond the horizon, are skipped. Back-to-back meetings each get
 * their own check-in, but two meetings that end within five minutes of each other share one.
 */
export function planNudges(slots: NudgeSlot[], now: Date, prefs: NudgePrefs, max = MAX_NUDGES): PlannedNudge[] {
  if (!prefs.enabled) return [];
  const horizon = now.getTime() + NUDGE_HORIZON_HOURS * 3_600_000;
  const planned: PlannedNudge[] = [];
  const sorted = [...slots].sort((a, b) => new Date(a.startIso).getTime() + a.durationMinutes * 60_000 - (new Date(b.startIso).getTime() + b.durationMinutes * 60_000));

  for (const slot of sorted) {
    const start = new Date(slot.startIso);
    if (Number.isNaN(start.getTime()) || slot.durationMinutes < 5 || slot.durationMinutes > 720) continue;
    const fireAt = new Date(start.getTime() + (slot.durationMinutes + prefs.delayMinutes) * 60_000);
    if (fireAt.getTime() <= now.getTime() + 30_000 || fireAt.getTime() > horizon) continue;
    const previous = planned[planned.length - 1];
    if (previous && Math.abs(fireAt.getTime() - previous.fireAt.getTime()) < 5 * 60_000) continue;
    planned.push({ identifier: nudgeIdentifier(slot), fireAt, startIso: start.toISOString(), durationMinutes: slot.durationMinutes, body: nudgeBody(slot) });
    if (planned.length >= max) break;
  }
  return planned;
}

/** Notification action identifiers look like `mood_energized`. */
export function moodFromAction(actionIdentifier: string | undefined): Mood | null {
  if (!actionIdentifier?.startsWith('mood_')) return null;
  const mood = actionIdentifier.slice(5) as Mood;
  return NUDGE_MOODS.includes(mood) ? mood : null;
}
