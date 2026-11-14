import { normalizeSeriesKey } from './series';
import type { Meeting, MeetingType, SeriesDecision } from './types';

/** How many recent weeks a verdict looks at. */
export const VERDICT_WEEKS = 4;

export type SeriesVerdict = {
  key: string;
  title: string;
  meetingType: MeetingType;
  count: number;
  hours: number;
  /** Sum of impact scores over the window: what the series cost or returned in total. */
  totalImpact: number;
  average: number;
  suggestion: SeriesDecision;
  /** One line explaining why, from the reasons you picked. */
  because: string;
  /** How many logs carried the deciding reason, when a reason decided it. */
  evidenceCount: number;
};

const ASYNC_REASONS = ['could-have-been-async', 'no-decision', 'repeated-discussion'];
const SHORTEN_REASONS = ['too-long', 'no-agenda'];
const DROP_REASONS = ['not-needed-here', 'too-many-people'];

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function countReasons(meetings: Meeting[], ids: string[]): { id: string | null; count: number } {
  let best: { id: string | null; count: number } = { id: null, count: 0 };
  ids.forEach((id) => {
    const count = meetings.filter((meeting) => meeting.reasonIds.includes(id)).length;
    if (count > best.count) best = { id, count };
  });
  return best;
}

const REASON_PHRASES: Record<string, string> = {
  'could-have-been-async': 'said it could have been async',
  'no-decision': 'ended without a decision',
  'repeated-discussion': 'repeated an earlier discussion',
  'too-long': 'ran too long',
  'no-agenda': 'had no agenda',
  'not-needed-here': 'said you weren’t needed',
  'too-many-people': 'had too many people',
};

/**
 * A verdict for each meeting you logged at least three times in the window, with a suggested action.
 * Rules, in order: a series that returns energy is kept; otherwise the most common friction reason picks
 * the action (async, shorten or pause); a costly series with no clear reason is shortened.
 */
export function getSeriesVerdicts(meetings: Meeting[], minimumCount = 3): SeriesVerdict[] {
  const groups = new Map<string, Meeting[]>();
  meetings.forEach((meeting) => {
    const key = normalizeSeriesKey(meeting.title, meeting.meetingType);
    groups.set(key, [...(groups.get(key) ?? []), meeting]);
  });

  return [...groups.entries()]
    .filter(([, items]) => items.length >= minimumCount)
    .map(([key, items]) => {
      const totalImpact = round(items.reduce((sum, item) => sum + item.impactScore, 0));
      const average = round(totalImpact / items.length);
      const hours = round(items.reduce((sum, item) => sum + item.durationMinutes, 0) / 60);
      const threshold = Math.max(2, Math.ceil(items.length / 3));
      const drop = countReasons(items, DROP_REASONS);
      const asyncReason = countReasons(items, ASYNC_REASONS);
      const shorten = countReasons(items, SHORTEN_REASONS);

      let suggestion: SeriesDecision = 'keep';
      let decider: { id: string | null; count: number } = { id: null, count: 0 };
      if (average >= 1) {
        suggestion = 'keep';
      } else if (drop.count >= threshold && drop.count >= asyncReason.count && drop.count >= shorten.count) {
        suggestion = 'drop';
        decider = drop;
      } else if (asyncReason.count >= threshold && asyncReason.count >= shorten.count) {
        suggestion = 'async';
        decider = asyncReason;
      } else if (shorten.count >= threshold) {
        suggestion = 'shorten';
        decider = shorten;
      } else if (average < 0) {
        suggestion = 'shorten';
      }

      const because = suggestion === 'keep'
        ? average >= 1 ? 'It returns energy more often than it costs it.' : 'No repeated friction yet.'
        : decider.id
          ? `${decider.count} of ${items.length} logs ${REASON_PHRASES[decider.id] ?? 'shared the same friction'}.`
          : 'It costs more than it returns, with no single reason standing out.';

      return {
        key,
        title: items[0]?.title.trim() ?? key,
        meetingType: items[0]?.meetingType ?? 'other',
        count: items.length,
        hours,
        totalImpact,
        average,
        suggestion,
        because,
        evidenceCount: decider.count,
      };
    })
    .sort((a, b) => a.totalImpact - b.totalImpact);
}

/** A short, neutral message to the organizer. Nothing is sent: the user shares it themselves. */
export function verdictMessage(verdict: Pick<SeriesVerdict, 'title' | 'suggestion' | 'count'>, decision: SeriesDecision = verdict.suggestion): string {
  const name = verdict.title;
  switch (decision) {
    case 'async':
      return `Hi! An idea for “${name}”: could we try running it async for the next two weeks? A short written update in the channel, with a live slot only when something needs a decision. Happy to draft the first update.`;
    case 'shorten':
      return `Hi! An idea for “${name}”: could we try a shorter slot with a three-line agenda shared the day before? If we finish early, we end early. Let’s see how it feels after two weeks.`;
    case 'drop':
      return `Hi! I’d like to step back from “${name}” for a few weeks and catch up from the notes instead. If something needs my input, please tag me and I’ll join that one.`;
    case 'keep':
    default:
      return `Hi! “${name}” has been working well for me lately. Thanks for running it.`;
  }
}
