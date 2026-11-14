import { MOOD_CONFIG, REASON_MAP } from './constants';
import type { Meeting, Mood } from './types';

export function getDurationMultiplier(durationMinutes: number): number {
  if (durationMinutes <= 15) return 1;
  if (durationMinutes <= 30) return 1.2;
  if (durationMinutes <= 60) return 1.5;
  if (durationMinutes <= 90) return 2;
  return 2.5;
}

/** Reasons explain a score; they should not overturn how the meeting felt. */
export const REASON_MODIFIER_CAP = 3;
export const MIN_MEETINGS_FOR_PATTERN = 3;

/** Sum of built-in reason modifiers (custom reasons carry no weight), capped at +/-3. */
export function getReasonModifier(reasonIds: string[]): number {
  const total = reasonIds.reduce((sum, id) => sum + (REASON_MAP[id as keyof typeof REASON_MAP]?.modifier ?? 0), 0);
  return Math.max(-REASON_MODIFIER_CAP, Math.min(REASON_MODIFIER_CAP, total));
}

export function calculateImpactScore(mood: Mood, durationMinutes: number, reasonIds: string[]): number {
  const raw = MOOD_CONFIG[mood].score * getDurationMultiplier(durationMinutes) + getReasonModifier(reasonIds);
  return Math.round(raw * 10) / 10;
}

export type PulseTone = 'positive' | 'neutral' | 'negative';

/** Tone uses the same thresholds as the week label so colour and words agree. */
export function getPulseTone(score: number): PulseTone {
  if (score >= 5) return 'positive';
  if (score <= -5) return 'negative';
  return 'neutral';
}

export function getPulseClassification(score: number): string {
  if (score >= 20) return 'Energizing Week';
  if (score >= 5) return 'Healthy Meeting Week';
  if (score > -5) return 'Neutral Week';
  if (score > -20) return 'Draining Week';
  return 'Heavy meeting week';
}

export function getImpactLabel(score: number): string {
  if (score >= 5) return 'High return';
  if (score > 0) return 'Energy returned';
  if (score === 0) return 'Neutral impact';
  if (score > -5) return 'Some friction';
  return 'High cost';
}

export function getMeetingSuggestion(meeting: Pick<Meeting, 'durationMinutes' | 'meetingType' | 'reasonIds'>): string {
  if (meeting.reasonIds.includes('no-decision')) {
    return 'Name the decision before the call, then close with an owner and next step.';
  }
  if (meeting.reasonIds.includes('could-have-been-async')) {
    return 'Move the update into a short async note and reserve live time for decisions.';
  }
  if (meeting.reasonIds.includes('unclear-ownership')) {
    return 'End with one named owner, one deliverable, and one due date.';
  }
  if (meeting.durationMinutes > 60 || meeting.reasonIds.includes('too-long')) {
    return 'Try a shorter, decision-focused session with a firm stop time.';
  }
  if (meeting.reasonIds.includes('too-many-people')) {
    return 'Invite only the people needed to decide; share the outcome with everyone else.';
  }
  if (meeting.reasonIds.includes('not-needed-here')) {
    return 'Ask for the decision or contribution you are needed for before accepting the next invite.';
  }
  if (meeting.reasonIds.includes('clear-outcome') || meeting.reasonIds.includes('fast-decision')) {
    return 'Keep this format: a visible outcome, the right people, and a crisp close.';
  }
  return 'Before the next call, write down the outcome that would make the time worthwhile.';
}
