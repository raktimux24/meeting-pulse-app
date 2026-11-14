import { addDays, endOfMonth, format, isSameDay, startOfMonth, startOfWeek, subMonths } from 'date-fns';

import type { IntendedOutcomeResult, Meeting, MeetingType } from './types';

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

// ---------- Month in pixels ----------

export type PixelDay = {
  date: Date;
  inMonth: boolean;
  count: number;
  /** Sum of the day's impact scores; null when nothing was logged. */
  total: number | null;
};

/** A calendar grid (whole weeks) for the month containing `month`, one cell per day. */
export function getMonthPixels(meetings: Meeting[], month: Date, weekStartsOn: 0 | 1): PixelDay[] {
  const first = startOfMonth(month);
  const last = endOfMonth(month);
  const gridStart = startOfWeek(first, { weekStartsOn });
  const days: PixelDay[] = [];
  for (let day = gridStart; day <= last || days.length % 7 !== 0; day = addDays(day, 1)) {
    const items = meetings.filter((meeting) => isSameDay(new Date(meeting.occurredAt), day));
    days.push({
      date: day,
      inMonth: day.getMonth() === first.getMonth(),
      count: items.length,
      total: items.length ? round(items.reduce((sum, item) => sum + item.impactScore, 0)) : null,
    });
  }
  return days;
}

export type MonthSummary = { loggedDays: number; positiveDays: number; negativeDays: number; meetings: number; total: number };

export function summarizeMonth(days: PixelDay[]): MonthSummary {
  const inMonth = days.filter((day) => day.inMonth && day.total != null);
  return {
    loggedDays: inMonth.length,
    positiveDays: inMonth.filter((day) => (day.total ?? 0) > 0).length,
    negativeDays: inMonth.filter((day) => (day.total ?? 0) < 0).length,
    meetings: inMonth.reduce((sum, day) => sum + day.count, 0),
    total: round(inMonth.reduce((sum, day) => sum + (day.total ?? 0), 0)),
  };
}

// ---------- Quarterly trends by meeting type ----------

export type TypeTrend = {
  meetingType: MeetingType;
  /** Average impact per month, oldest first; null for a month with no logs of this type. */
  months: (number | null)[];
  count: number;
  /** Last month with data minus the first month with data; null with fewer than two months. */
  change: number | null;
};

export type QuarterTrends = { monthLabels: string[]; monthStarts: Date[]; types: TypeTrend[] };

/** Average impact per meeting type over the last three calendar months (including this one). */
export function getQuarterTrends(meetings: Meeting[], now: Date, monthCount = 3): QuarterTrends {
  const monthStarts = Array.from({ length: monthCount }, (_, index) => startOfMonth(subMonths(now, monthCount - 1 - index)));
  const monthIndex = (date: Date) => monthStarts.findIndex((start, index) => {
    const nextStart = monthStarts[index + 1];
    return date >= start && (!nextStart || date < nextStart) && date <= endOfMonth(start);
  });

  const byType = new Map<MeetingType, number[][]>();
  meetings.forEach((meeting) => {
    const index = monthIndex(new Date(meeting.occurredAt));
    if (index < 0) return;
    const buckets = byType.get(meeting.meetingType) ?? monthStarts.map(() => []);
    buckets[index].push(meeting.impactScore);
    byType.set(meeting.meetingType, buckets);
  });

  const types = [...byType.entries()].map(([meetingType, buckets]) => {
    const months = buckets.map((values) => (values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length) : null));
    const filled = months.filter((value): value is number => value != null);
    return {
      meetingType,
      months,
      count: buckets.reduce((sum, values) => sum + values.length, 0),
      change: filled.length >= 2 ? round(filled[filled.length - 1] - filled[0]) : null,
    };
  }).sort((a, b) => b.count - a.count);

  return { monthLabels: monthStarts.map((start) => format(start, 'MMM')), monthStarts, types };
}

// ---------- Outcome hit rate ----------

const HIT_VALUE: Record<IntendedOutcomeResult, number> = { yes: 1, partly: 0.5, no: 0 };

export type HitRate = {
  /** Meetings with an intended outcome and an answer. */
  answered: number;
  /** Meetings that set an intended outcome, answered or not. */
  withIntent: number;
  /** 0 to 100; partly counts as half. Null with no answers. */
  rate: number | null;
};

export function getOutcomeHitRate(meetings: Meeting[]): HitRate {
  const withIntent = meetings.filter((meeting) => meeting.intendedOutcome?.trim());
  const answered = withIntent.filter((meeting) => meeting.intendedOutcomeMet);
  const rate = answered.length
    ? Math.round((answered.reduce((sum, meeting) => sum + HIT_VALUE[meeting.intendedOutcomeMet!], 0) / answered.length) * 100)
    : null;
  return { answered: answered.length, withIntent: withIntent.length, rate };
}

export type TypeHitRate = HitRate & { meetingType: MeetingType };

/** Hit rate per meeting type, for types with at least `minimum` answered meetings. Lowest first. */
export function getHitRateByType(meetings: Meeting[], minimum = 2): TypeHitRate[] {
  const types = [...new Set(meetings.map((meeting) => meeting.meetingType))];
  return types
    .map((meetingType) => ({ meetingType, ...getOutcomeHitRate(meetings.filter((meeting) => meeting.meetingType === meetingType)) }))
    .filter((item) => item.answered >= minimum)
    .sort((a, b) => (a.rate ?? 0) - (b.rate ?? 0));
}

/** Hit rate per month, oldest first, for the given month starts. */
export function getHitRateByMonth(meetings: Meeting[], monthStarts: Date[]): (number | null)[] {
  return monthStarts.map((start) => {
    const end = endOfMonth(start);
    return getOutcomeHitRate(meetings.filter((meeting) => {
      const date = new Date(meeting.occurredAt);
      return date >= start && date <= end;
    })).rate;
  });
}
