import type { MeetingType, Mood, Reason } from './types';

export const MOOD_CONFIG: Record<Mood, { label: string; score: number; short: string }> = {
  energized: { label: 'Energized', score: 3, short: 'Energy up' },
  clear: { label: 'Clear', score: 2, short: 'Clearer' },
  aligned: { label: 'Aligned', score: 2, short: 'In sync' },
  neutral: { label: 'Neutral', score: 0, short: 'Steady' },
  confused: { label: 'Confused', score: -1, short: 'Less clear' },
  drained: { label: 'Drained', score: -2, short: 'Energy down' },
  frustrated: { label: 'Frustrated', score: -3, short: 'Friction' },
  anxious: { label: 'Anxious', score: -3, short: 'Uneasy' },
};

export const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  standup: 'Standup',
  review: 'Review',
  planning: 'Planning',
  'client-call': 'Client call',
  'one-on-one': '1:1',
  brainstorm: 'Brainstorm',
  'status-update': 'Status update',
  'decision-meeting': 'Decision meeting',
  presentation: 'Presentation',
  other: 'Other',
};

export const REASONS: Reason[] = [
  { id: 'clear-outcome', label: 'Clear outcome', modifier: 2, sentiment: 'positive' },
  { id: 'good-facilitation', label: 'Good facilitation', modifier: 1, sentiment: 'positive' },
  { id: 'right-people', label: 'Right people', modifier: 1, sentiment: 'positive' },
  { id: 'fast-decision', label: 'Fast decision', modifier: 2, sentiment: 'positive' },
  { id: 'useful-discussion', label: 'Useful discussion', modifier: 1, sentiment: 'positive' },
  { id: 'strong-alignment', label: 'Strong alignment', modifier: 2, sentiment: 'positive' },
  { id: 'no-agenda', label: 'No agenda', modifier: -1, sentiment: 'negative' },
  { id: 'too-many-people', label: 'Too many people', modifier: -1, sentiment: 'negative' },
  { id: 'unclear-ownership', label: 'Unclear ownership', modifier: -2, sentiment: 'negative' },
  { id: 'repeated-discussion', label: 'Repeated discussion', modifier: -1, sentiment: 'negative' },
  { id: 'no-decision', label: 'No decision', modifier: -2, sentiment: 'negative' },
  { id: 'could-have-been-async', label: 'Could have been async', modifier: -2, sentiment: 'negative' },
  { id: 'poor-context', label: 'Poor context', modifier: -1, sentiment: 'negative' },
  { id: 'dominated-by-one-person', label: 'Dominated by one person', modifier: -1, sentiment: 'negative' },
  { id: 'too-long', label: 'Too long', modifier: -1, sentiment: 'negative' },
  { id: 'last-minute-invite', label: 'Last-minute invite', modifier: -1, sentiment: 'negative' },
];

export const REASON_MAP = Object.fromEntries(REASONS.map((reason) => [reason.id, reason])) as Record<
  Reason['id'],
  Reason
>;
