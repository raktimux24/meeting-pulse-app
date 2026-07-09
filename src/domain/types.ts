export const MOODS = [
  'energized',
  'clear',
  'aligned',
  'neutral',
  'confused',
  'drained',
  'frustrated',
  'anxious',
] as const;

export type Mood = (typeof MOODS)[number];

export const MEETING_TYPES = [
  'standup',
  'review',
  'planning',
  'client-call',
  'one-on-one',
  'brainstorm',
  'status-update',
  'decision-meeting',
  'presentation',
  'other',
] as const;

export type MeetingType = (typeof MEETING_TYPES)[number];

export type ReasonId =
  | 'clear-outcome'
  | 'good-facilitation'
  | 'right-people'
  | 'fast-decision'
  | 'useful-discussion'
  | 'strong-alignment'
  | 'no-agenda'
  | 'too-many-people'
  | 'unclear-ownership'
  | 'repeated-discussion'
  | 'no-decision'
  | 'could-have-been-async'
  | 'poor-context'
  | 'dominated-by-one-person'
  | 'too-long'
  | 'last-minute-invite';

export type Reason = {
  id: ReasonId;
  label: string;
  modifier: number;
  sentiment: 'positive' | 'negative';
};

export type Meeting = {
  id: string;
  title: string;
  occurredAt: string;
  durationMinutes: number;
  meetingType: MeetingType;
  peopleCount: number;
  note: string;
  mood: Mood;
  impactScore: number;
  reasonIds: ReasonId[];
  createdAt: string;
  updatedAt: string;
};

export type MeetingInput = Omit<Meeting, 'id' | 'impactScore' | 'createdAt' | 'updatedAt'>;

export type Insight = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  tone: 'positive' | 'negative' | 'neutral';
};

export type WeekSummary = {
  meetings: Meeting[];
  meetingCount: number;
  totalMinutes: number;
  weeklyPulse: number;
  classification: string;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  mostDrainingType: MeetingType | null;
  mostUsefulType: MeetingType | null;
  topNegativeReason: ReasonId | null;
  bestPattern: string;
  weekdayScores: { date: string; label: string; score: number }[];
  insights: Insight[];
};
