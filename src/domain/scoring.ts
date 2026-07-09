import { MOOD_CONFIG, REASON_MAP } from './constants';
import type { Meeting, Mood, ReasonId } from './types';

export function getDurationMultiplier(durationMinutes: number): number {
  if (durationMinutes <= 15) return 1;
  if (durationMinutes <= 30) return 1.2;
  if (durationMinutes <= 60) return 1.5;
  if (durationMinutes <= 90) return 2;
  return 2.5;
}

export function calculateImpactScore(mood: Mood, durationMinutes: number, reasonIds: ReasonId[]): number {
  const reasonTotal = reasonIds.reduce((sum, id) => sum + REASON_MAP[id].modifier, 0);
  const raw = MOOD_CONFIG[mood].score * getDurationMultiplier(durationMinutes) + reasonTotal;
  return Math.round(raw * 10) / 10;
}

export function getPulseClassification(score: number): string {
  if (score >= 20) return 'Energizing Week';
  if (score >= 5) return 'Healthy Meeting Week';
  if (score > -5) return 'Neutral Week';
  if (score > -20) return 'Draining Week';
  return 'Meeting Damage Week';
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
  if (meeting.reasonIds.includes('clear-outcome') || meeting.reasonIds.includes('fast-decision')) {
    return 'Keep this format: a visible outcome, the right people, and a crisp close.';
  }
  return 'Before the next call, write down the outcome that would make the time worthwhile.';
}
