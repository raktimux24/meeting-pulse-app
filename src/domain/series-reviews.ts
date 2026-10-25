import { SERIES_DECISIONS, type SeriesDecision, type SeriesReview } from './types';

export const SERIES_DECISION_LABELS: Record<SeriesDecision, string> = {
  keep: 'Keep',
  shorten: 'Shorten',
  async: 'Move async',
  drop: 'Pause',
};

export function parseSeriesReviews(raw: string | null): SeriesReview[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const candidate = item as Partial<SeriesReview>;
      if (
        typeof candidate.key !== 'string' ||
        typeof candidate.title !== 'string' ||
        typeof candidate.meetingType !== 'string' ||
        typeof candidate.updatedAt !== 'string' ||
        !SERIES_DECISIONS.includes(candidate.decision as SeriesDecision)
      ) return [];
      return [{
        key: candidate.key,
        title: candidate.title,
        meetingType: candidate.meetingType,
        decision: candidate.decision as SeriesDecision,
        updatedAt: candidate.updatedAt,
      }];
    }).slice(0, 50);
  } catch {
    return [];
  }
}

export function upsertSeriesReview(current: SeriesReview[], next: SeriesReview): SeriesReview[] {
  return [...current.filter((item) => item.key !== next.key), next].slice(-50);
}
