import { isSameWeek } from 'date-fns';

import { EXPERIMENT_RESULTS, type ExperimentResult, type WeeklyIntention } from './types';

export function parseIntention(raw: string | null): WeeklyIntention | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as WeeklyIntention;
    if (typeof parsed.text !== 'string' || typeof parsed.weekStartIso !== 'string') return null;
    return {
      text: parsed.text,
      weekStartIso: parsed.weekStartIso,
      tried: Boolean(parsed.tried),
      sourceInsightId: typeof parsed.sourceInsightId === 'string' ? parsed.sourceInsightId : undefined,
      experimentTemplateId: typeof parsed.experimentTemplateId === 'string' ? parsed.experimentTemplateId : undefined,
      result: EXPERIMENT_RESULTS.includes(parsed.result as ExperimentResult) ? parsed.result as ExperimentResult : undefined,
      reviewedAt: typeof parsed.reviewedAt === 'string' ? parsed.reviewedAt : undefined,
    };
  } catch {
    return null;
  }
}

export function intentionForWeek(intention: WeeklyIntention | null, weekStart: Date, weekStartsOn: 0 | 1): WeeklyIntention | null {
  if (!intention) return null;
  return isSameWeek(new Date(intention.weekStartIso), weekStart, { weekStartsOn }) ? intention : null;
}
