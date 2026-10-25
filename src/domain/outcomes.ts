import { meetingTypeLabel } from './meeting-types';
import type { Insight, Meeting, OutcomeStatus } from './types';

export const OUTCOME_STATUS_LABELS: Record<OutcomeStatus, string> = {
  yes: 'Yes',
  no: 'No',
  'not-needed': 'Not needed',
};

type OutcomeField = 'decisionStatus' | 'ownershipStatus' | 'nextStepStatus';

function negativePattern(
  meetings: Meeting[],
  field: OutcomeField,
): { answered: number; negative: number; type: string | null } | null {
  const answeredMeetings = meetings.filter((meeting) => meeting[field] != null);
  if (answeredMeetings.length < 3) return null;
  const negative = answeredMeetings.filter((meeting) => meeting[field] === 'no').length;
  if (negative / answeredMeetings.length < 0.5) return null;

  const typeCounts = new Map<string, { answered: number; negative: number }>();
  answeredMeetings.forEach((meeting) => {
    const current = typeCounts.get(meeting.meetingType) ?? { answered: 0, negative: 0 };
    current.answered += 1;
    if (meeting[field] === 'no') current.negative += 1;
    typeCounts.set(meeting.meetingType, current);
  });
  const strongestType = [...typeCounts.entries()]
    .filter(([, counts]) => counts.answered >= 3 && counts.negative / counts.answered >= 0.5)
    .sort((a, b) => b[1].negative / b[1].answered - a[1].negative / a[1].answered)[0]?.[0] ?? null;

  return { answered: answeredMeetings.length, negative, type: strongestType };
}

export function generateOutcomeInsights(meetings: Meeting[]): Insight[] {
  const insights: Insight[] = [];
  const decision = negativePattern(meetings, 'decisionStatus');
  const ownership = negativePattern(meetings, 'ownershipStatus');
  const nextStep = negativePattern(meetings, 'nextStepStatus');

  if (decision) {
    const context = decision.type ? ` logged ${meetingTypeLabel(decision.type)} meetings` : ' logged meetings';
    insights.push({
      id: 'outcome-decision',
      eyebrow: 'Outcome clarity',
      title: `${decision.negative} of ${decision.answered}${context} ended without a decision`,
      body: 'For the next meeting, name the decision at the start and close by stating what was decided.',
      tone: 'negative',
    });
  }

  if (ownership) {
    insights.push({
      id: 'outcome-ownership',
      eyebrow: 'Ownership gap',
      title: `${ownership.negative} of ${ownership.answered} logged meetings ended without clear ownership`,
      body: 'Close the next meeting by naming one owner for the next step.',
      tone: 'negative',
    });
  }

  if (nextStep) {
    insights.push({
      id: 'outcome-next-step',
      eyebrow: 'Follow-through gap',
      title: `${nextStep.negative} of ${nextStep.answered} logged meetings ended without a clear next step`,
      body: 'Before the next meeting ends, state the next action in one sentence.',
      tone: 'negative',
    });
  }

  return insights;
}

export function answeredOutcomeCount(meeting: Meeting): number {
  return [meeting.decisionStatus, meeting.ownershipStatus, meeting.nextStepStatus].filter(Boolean).length;
}
