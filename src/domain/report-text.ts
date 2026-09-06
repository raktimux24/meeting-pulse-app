import { format } from 'date-fns';

import { REASON_MAP } from './constants';
import { formatSigned } from './format';
import { meetingTypeLabel } from './meeting-types';
import type { WeekSummary } from './types';

export function buildReportShareText(summary: WeekSummary, start: Date, end: Date): string {
  const recommendation = summary.insights[0]?.body ?? 'Keep logging to reveal a pattern worth changing.';
  const useful = summary.mostUsefulType ? meetingTypeLabel(summary.mostUsefulType) : 'No clear leader';
  const draining = summary.mostDrainingType ? meetingTypeLabel(summary.mostDrainingType) : 'No clear drag';
  const issue = summary.topNegativeReason ? REASON_MAP[summary.topNegativeReason].label : 'None repeated';

  return [
    `Meeting Pulse · ${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`,
    `${summary.classification} · mood balance ${formatSigned(summary.weeklyPulse)}`,
    `${summary.meetingCount} meetings · ${(summary.totalMinutes / 60).toFixed(1)}h in calls · ${summary.positiveCount} return / ${summary.negativeCount} cost`,
    `Most useful: ${useful}`,
    `Most draining: ${draining}`,
    `Top issue: ${issue}`,
    `One fix for next week: ${recommendation}`,
    'Private reflection · shared without meeting names, notes, or attendee details.',
  ].join('\n');
}
