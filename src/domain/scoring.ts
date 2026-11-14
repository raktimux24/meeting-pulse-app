import { MOOD_CONFIG, REASON_MAP } from './constants';
import type { IntendedOutcomeResult, Meeting, Mood, OutcomeStatus } from './types';

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

/** Optional outcome answers from a full reflection. All fields may be missing. */
export type OutcomeSignals = {
  decisionStatus?: OutcomeStatus | null;
  ownershipStatus?: OutcomeStatus | null;
  nextStepStatus?: OutcomeStatus | null;
  intendedOutcome?: string | null;
  intendedOutcomeMet?: IntendedOutcomeResult | null;
};

/** Points for each outcome-check answer. "Not needed" is neutral. */
export const OUTCOME_CHECK_POINTS: Record<OutcomeStatus, number> = { yes: 1, no: -1, 'not-needed': 0 };
/** Points for whether the meeting produced what was intended. */
export const INTENDED_OUTCOME_POINTS: Record<IntendedOutcomeResult, number> = { yes: 1.5, partly: 0.5, no: -1.5 };
export const OUTCOME_MODIFIER_CAP = 3;

/**
 * Outcome answers, capped at +/-3 so the mood still leads.
 * A question is skipped when a reason already scored the same thing
 * ("No decision" covers the decision question, "Unclear ownership" the ownership one).
 */
export function getOutcomeModifier(outcomes: OutcomeSignals | undefined, reasonIds: string[]): number {
  if (!outcomes) return 0;
  let total = 0;
  if (outcomes.decisionStatus && !reasonIds.includes('no-decision')) total += OUTCOME_CHECK_POINTS[outcomes.decisionStatus];
  if (outcomes.ownershipStatus && !reasonIds.includes('unclear-ownership')) total += OUTCOME_CHECK_POINTS[outcomes.ownershipStatus];
  if (outcomes.nextStepStatus) total += OUTCOME_CHECK_POINTS[outcomes.nextStepStatus];
  if (outcomes.intendedOutcome?.trim() && outcomes.intendedOutcomeMet) total += INTENDED_OUTCOME_POINTS[outcomes.intendedOutcomeMet];
  return Math.max(-OUTCOME_MODIFIER_CAP, Math.min(OUTCOME_MODIFIER_CAP, total));
}

export type ScoreBreakdown = { moodBase: number; multiplier: number; reasons: number; outcomes: number; total: number };

/** Every term of the score, for the "How this was calculated" view. */
export function getScoreBreakdown(mood: Mood, durationMinutes: number, reasonIds: string[], outcomes?: OutcomeSignals): ScoreBreakdown {
  const moodBase = MOOD_CONFIG[mood].score;
  const multiplier = getDurationMultiplier(durationMinutes);
  const reasons = getReasonModifier(reasonIds);
  const outcomeTotal = getOutcomeModifier(outcomes, reasonIds);
  const total = Math.round((moodBase * multiplier + reasons + outcomeTotal) * 10) / 10;
  return { moodBase, multiplier, reasons, outcomes: outcomeTotal, total };
}

/** Score = mood x duration + reasons (capped) + outcomes (capped). */
export function calculateImpactScore(mood: Mood, durationMinutes: number, reasonIds: string[], outcomes?: OutcomeSignals): number {
  const raw = MOOD_CONFIG[mood].score * getDurationMultiplier(durationMinutes) + getReasonModifier(reasonIds) + getOutcomeModifier(outcomes, reasonIds);
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
