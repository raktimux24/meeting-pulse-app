import { eachDayOfInterval, format, isWithinInterval } from 'date-fns';

import { MEETING_TYPE_LABELS, REASON_MAP } from './constants';
import { getPulseClassification } from './scoring';
import type { Insight, Meeting, MeetingType, ReasonId, WeekSummary } from './types';

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function typeAverages(meetings: Meeting[]) {
  return meetings.reduce<Partial<Record<MeetingType, number[]>>>((groups, meeting) => {
    groups[meeting.meetingType] = [...(groups[meeting.meetingType] ?? []), meeting.impactScore];
    return groups;
  }, {});
}

function rankedTypes(meetings: Meeting[]) {
  return Object.entries(typeAverages(meetings))
    .map(([type, scores]) => ({ type: type as MeetingType, average: average(scores), count: scores.length }))
    .sort((a, b) => b.average - a.average);
}

function topNegativeReason(meetings: Meeting[]): ReasonId | null {
  const counts = new Map<ReasonId, number>();
  meetings.forEach((meeting) =>
    meeting.reasonIds.forEach((id) => {
      if (REASON_MAP[id].sentiment === 'negative') counts.set(id, (counts.get(id) ?? 0) + 1);
    }),
  );
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export function generateInsights(meetings: Meeting[]): Insight[] {
  const insights: Insight[] = [];
  const reasonCount = (id: ReasonId) => meetings.filter((meeting) => meeting.reasonIds.includes(id)).length;
  const leadingReason = topNegativeReason(meetings);

  if (meetings.length < 3) {
    return [
      {
        id: 'keep-logging',
        eyebrow: 'Signal building',
        title: `${meetings.length} of 3 meetings logged`,
        body: 'A few more reflections will reveal which formats consistently help or hurt your week.',
        tone: 'neutral',
      },
    ];
  }

  if (leadingReason === 'no-decision') {
    insights.push({
      id: 'no-decision',
      eyebrow: 'Closure gap',
      title: 'Discussion is not becoming a decision',
      body: 'Write the decision at the top of the agenda and close with an owner plus a next step.',
      tone: 'negative',
    });
  }

  if (reasonCount('could-have-been-async') >= 3) {
    insights.push({
      id: 'async',
      eyebrow: 'Async opportunity',
      title: `${reasonCount('could-have-been-async')} calls could have been updates`,
      body: 'Move status sharing into a written update and protect live time for debate and decisions.',
      tone: 'negative',
    });
  }

  const longMeetings = meetings.filter((meeting) => meeting.durationMinutes > 60);
  if (longMeetings.length >= 2 && average(longMeetings.map((meeting) => meeting.impactScore)) < 0) {
    insights.push({
      id: 'long-meetings',
      eyebrow: 'Duration drag',
      title: 'Long meetings are costing more',
      body: 'Break 60+ minute sessions into shorter, outcome-led blocks with a firm stop time.',
      tone: 'negative',
    });
  }

  const oneOnOnes = meetings.filter((meeting) => meeting.meetingType === 'one-on-one');
  const groups = meetings.filter((meeting) => meeting.peopleCount > 2);
  if (
    oneOnOnes.length >= 2 &&
    groups.length >= 2 &&
    average(oneOnOnes.map((meeting) => meeting.impactScore)) > 0 &&
    average(groups.map((meeting) => meeting.impactScore)) < 0
  ) {
    insights.push({
      id: 'group-size',
      eyebrow: 'Small-room advantage',
      title: '1:1s are working better than group calls',
      body: 'Bring the clarity of smaller conversations into group calls with tighter invites and facilitation.',
      tone: 'positive',
    });
  }

  const worstType = rankedTypes(meetings)
    .filter((item) => item.count >= 3 && item.average <= -2)
    .sort((a, b) => a.average - b.average)[0];
  if (worstType) {
    insights.push({
      id: `type-${worstType.type}`,
      eyebrow: 'Recurring cost',
      title: `${MEETING_TYPE_LABELS[worstType.type]}s need a reset`,
      body: 'Review the recurring format, expected outcome, and attendee list before the next one.',
      tone: 'negative',
    });
  }

  const shortClear = meetings.filter(
    (meeting) => meeting.durationMinutes <= 30 && meeting.reasonIds.includes('clear-outcome'),
  );
  if (
    shortClear.length >= 2 &&
    average(shortClear.map((meeting) => meeting.impactScore)) >
      average(meetings.map((meeting) => meeting.impactScore))
  ) {
    insights.push({
      id: 'short-clear',
      eyebrow: 'Pattern to keep',
      title: 'Short, outcome-led meetings outperform',
      body: 'Your best calls stay under 30 minutes and make the desired outcome explicit.',
      tone: 'positive',
    });
  }

  return insights.slice(0, 3).length
    ? insights.slice(0, 3)
    : [
        {
          id: 'balanced',
          eyebrow: 'Week in view',
          title: 'No single pattern dominates yet',
          body: 'Keep logging outcomes and friction points; the strongest repeated signal will surface here.',
          tone: 'neutral',
        },
      ];
}

export function summarizeWeek(meetings: Meeting[], start: Date, end: Date): WeekSummary {
  const weekMeetings = meetings.filter((meeting) =>
    isWithinInterval(new Date(meeting.occurredAt), { start, end }),
  );
  const weeklyPulse = Math.round(weekMeetings.reduce((sum, meeting) => sum + meeting.impactScore, 0) * 10) / 10;
  const types = rankedTypes(weekMeetings);
  const bestType = types[0]?.average > 0 ? types[0].type : null;
  const worstType = [...types].reverse()[0]?.average < 0 ? [...types].reverse()[0].type : null;
  const shortClear = weekMeetings.filter(
    (meeting) => meeting.durationMinutes <= 30 && meeting.reasonIds.includes('clear-outcome'),
  );

  return {
    meetings: weekMeetings,
    meetingCount: weekMeetings.length,
    totalMinutes: weekMeetings.reduce((sum, meeting) => sum + meeting.durationMinutes, 0),
    weeklyPulse,
    classification: getPulseClassification(weeklyPulse),
    positiveCount: weekMeetings.filter((meeting) => meeting.impactScore > 0).length,
    neutralCount: weekMeetings.filter((meeting) => meeting.impactScore === 0).length,
    negativeCount: weekMeetings.filter((meeting) => meeting.impactScore < 0).length,
    mostDrainingType: worstType,
    mostUsefulType: bestType,
    topNegativeReason: topNegativeReason(weekMeetings),
    bestPattern: shortClear.length >= 2 ? 'Short calls with a clear outcome' : 'Still collecting signal',
    weekdayScores: eachDayOfInterval({ start, end }).map((day) => ({
      date: day.toISOString(),
      label: format(day, 'EEE').slice(0, 1),
      score: Math.round(
        weekMeetings
          .filter((meeting) => format(new Date(meeting.occurredAt), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'))
          .reduce((sum, meeting) => sum + meeting.impactScore, 0) * 10,
      ) / 10,
    })),
    insights: generateInsights(weekMeetings),
  };
}
