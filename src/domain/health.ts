import { MOOD_CONFIG } from './constants';
import type { Mood } from './types';

/**
 * How a mood is written to Apple Health as a "State of Mind" sample.
 * Valence runs from -1 (very unpleasant) to 1 (very pleasant); labels are HealthKit's own emotion names.
 */
export const HEALTH_LABELS: Record<Mood, string> = {
  energized: 'excited',
  clear: 'confident',
  aligned: 'satisfied',
  neutral: 'indifferent',
  confused: 'overwhelmed',
  drained: 'drained',
  frustrated: 'frustrated',
  anxious: 'anxious',
};

const MAX_SCORE = 3;

export function moodValence(mood: Mood): number {
  return Math.round((MOOD_CONFIG[mood].score / MAX_SCORE) * 100) / 100;
}

export type StateOfMindSample = { valence: number; label: string; dateIso: string };

export function stateOfMindFor(mood: Mood, occurredAt: string, durationMinutes = 0): StateOfMindSample {
  // Logged at the end of the meeting, which is when the feeling was captured.
  const end = new Date(new Date(occurredAt).getTime() + Math.max(0, durationMinutes) * 60_000);
  return { valence: moodValence(mood), label: HEALTH_LABELS[mood], dateIso: end.toISOString() };
}
