import { summarizeRecovery } from './recovery';
import type { Meeting, MeetingBudgetPrefs } from './types';

export const DEFAULT_MEETING_BUDGET: MeetingBudgetPrefs = {
  enabled: false,
  weeklyMinutes: null,
  maxCostMeetings: null,
  maxBlockMinutes: null,
  preferredBufferMinutes: null,
};

export type BudgetMetric = {
  id: 'meeting-time' | 'cost-meetings' | 'longest-block';
  label: string;
  current: number;
  limit: number;
  unit: 'minutes' | 'meetings';
  status: 'under' | 'near' | 'over';
};

export type MeetingBudgetSummary = {
  enabled: boolean;
  metrics: BudgetMetric[];
  preferredBufferMinutes: number | null;
  shortTransitions: number;
};

function validNumber(value: unknown, min: number, max: number): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
    ? Math.round(value)
    : null;
}

export function normalizeMeetingBudget(value: unknown): MeetingBudgetPrefs {
  if (!value || typeof value !== 'object') return DEFAULT_MEETING_BUDGET;
  const candidate = value as Partial<MeetingBudgetPrefs>;
  const buffer = validNumber(candidate.preferredBufferMinutes, 10, 30);
  return {
    enabled: candidate.enabled === true,
    weeklyMinutes: validNumber(candidate.weeklyMinutes, 30, 10_080),
    maxCostMeetings: validNumber(candidate.maxCostMeetings, 1, 100),
    maxBlockMinutes: validNumber(candidate.maxBlockMinutes, 15, 720),
    preferredBufferMinutes: buffer === 10 || buffer === 15 || buffer === 30 ? buffer : null,
  };
}

export function parseMeetingBudget(raw: string | null): MeetingBudgetPrefs {
  if (!raw) return DEFAULT_MEETING_BUDGET;
  try {
    return normalizeMeetingBudget(JSON.parse(raw));
  } catch {
    return DEFAULT_MEETING_BUDGET;
  }
}

function metric(
  id: BudgetMetric['id'],
  label: string,
  current: number,
  limit: number | null,
  unit: BudgetMetric['unit'],
): BudgetMetric | null {
  if (limit == null) return null;
  return {
    id,
    label,
    current,
    limit,
    unit,
    status: current > limit ? 'over' : current >= limit * 0.8 ? 'near' : 'under',
  };
}

export function summarizeBudget(meetings: Meeting[], prefs: MeetingBudgetPrefs): MeetingBudgetSummary {
  const recovery = summarizeRecovery(meetings, prefs.preferredBufferMinutes ?? undefined);
  const metrics = [
    metric('meeting-time', 'Logged meeting time', meetings.reduce((sum, meeting) => sum + meeting.durationMinutes, 0), prefs.weeklyMinutes, 'minutes'),
    metric('cost-meetings', 'Cost meetings', meetings.filter((meeting) => meeting.impactScore < 0).length, prefs.maxCostMeetings, 'meetings'),
    metric('longest-block', 'Longest logged block', recovery.longestBlockMinutes, prefs.maxBlockMinutes, 'minutes'),
  ].filter((item): item is BudgetMetric => item != null);

  return {
    enabled: prefs.enabled,
    metrics,
    preferredBufferMinutes: prefs.preferredBufferMinutes,
    shortTransitions: prefs.preferredBufferMinutes ? recovery.tightTransitions : 0,
  };
}

export function priorityBudgetMetric(summary: MeetingBudgetSummary): BudgetMetric | null {
  if (!summary.enabled) return null;
  return [...summary.metrics]
    .filter((item) => item.status !== 'under')
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'over' ? -1 : 1;
      return b.current / b.limit - a.current / a.limit;
    })[0] ?? null;
}
