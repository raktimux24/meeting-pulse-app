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

export const OUTCOME_STATUSES = ['yes', 'no', 'not-needed'] as const;
export type OutcomeStatus = (typeof OUTCOME_STATUSES)[number];

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

export type DefaultMeetingType = (typeof MEETING_TYPES)[number];
export type MeetingType = string;

export type CustomMeetingType = {
  id: MeetingType;
  label: string;
};

export type ReasonSentiment = 'positive' | 'negative';

export type CustomReason = {
  id: string;
  label: string;
  sentiment: ReasonSentiment;
  active?: boolean;
};

export const REASON_IDS = [
  'clear-outcome',
  'good-facilitation',
  'right-people',
  'fast-decision',
  'useful-discussion',
  'strong-alignment',
  'no-agenda',
  'too-many-people',
  'unclear-ownership',
  'repeated-discussion',
  'no-decision',
  'could-have-been-async',
  'poor-context',
  'dominated-by-one-person',
  'too-long',
  'last-minute-invite',
  'not-needed-here',
] as const;

export type ReasonId = (typeof REASON_IDS)[number];

export type Reason = {
  id: ReasonId;
  label: string;
  modifier: number;
  sentiment: ReasonSentiment;
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
  reasonIds: string[];
  decisionStatus: OutcomeStatus | null;
  ownershipStatus: OutcomeStatus | null;
  nextStepStatus: OutcomeStatus | null;
  intendedOutcome: string | null;
  createdAt: string;
  updatedAt: string;
};

type OptionalReflectionFields = Pick<Meeting, 'decisionStatus' | 'ownershipStatus' | 'nextStepStatus' | 'intendedOutcome'>;

export type MeetingInput = Omit<Meeting, 'id' | 'impactScore' | 'createdAt' | 'updatedAt' | keyof OptionalReflectionFields> &
  Partial<OptionalReflectionFields>;

export type QuickPulse = {
  id: string;
  occurredAt: string;
  mood: Mood;
  reasonId: string | null;
  createdAt: string;
};

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

export type WeekDelta = {
  previousPulse: number;
  delta: number;
  previousClassification: string;
};

export type SeriesPulse = {
  key: string;
  title: string;
  meetingType: MeetingType;
  count: number;
  average: number;
  recentAverage: number;
  previousAverage: number | null;
  trend: number | null;
};

export const EXPERIMENT_RESULTS = ['helped', 'somewhat', 'no', 'not-tried'] as const;
export type ExperimentResult = (typeof EXPERIMENT_RESULTS)[number];

export type WeeklyIntention = {
  text: string;
  weekStartIso: string;
  tried: boolean;
  sourceInsightId?: string;
  experimentTemplateId?: string;
  result?: ExperimentResult;
  reviewedAt?: string;
};

export const SERIES_DECISIONS = ['keep', 'shorten', 'async', 'drop'] as const;
export type SeriesDecision = (typeof SERIES_DECISIONS)[number];

export type SeriesReview = {
  key: string;
  title: string;
  meetingType: MeetingType;
  decision: SeriesDecision;
  updatedAt: string;
};

export type ReminderPrefs = {
  enabled: boolean;
  hour: number;
  minute: number;
};

export type MeetingBudgetPrefs = {
  enabled: boolean;
  weeklyMinutes: number | null;
  maxCostMeetings: number | null;
  maxBlockMinutes: number | null;
  preferredBufferMinutes: 10 | 15 | 30 | null;
};

export type LogOrigin = 'today' | 'history' | 'insights';
