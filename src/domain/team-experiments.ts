export type TeamExperiment = {
  id: string;
  title: string;
  text: string;
};

export const ACTION_KIT_IDS = ['ask-agenda', 'decline-optional', 'async-update', 'timebox'] as const;

const EXPERIMENTS: Record<string, TeamExperiment> = {
  'ask-agenda': {
    id: 'ask-agenda',
    title: 'Ask for an agenda',
    text: 'Before I join, could you share the decision or outcome this meeting needs to produce?',
  },
  'decline-optional': {
    id: 'decline-optional',
    title: 'Decline optional attendance',
    text: 'I may not be needed live for this one. Could I review the outcome afterward and join only if a decision needs my input?',
  },
  'async-update': {
    id: 'async-update',
    title: 'Propose a written update',
    text: 'Could we try one written status update this week and use live time only for questions and decisions?',
  },
  timebox: {
    id: 'timebox',
    title: 'Propose a shorter session',
    text: 'Could we timebox the next session to 30 minutes and define the outcome at the start?',
  },
  async: {
    id: 'async-update',
    title: 'Try one async update',
    text: 'Could we try one written status update this week and use live time only for questions and decisions?',
  },
  'recurring-async': {
    id: 'async-update',
    title: 'Try one async update',
    text: 'Could we try one written status update this week and use live time only for questions and decisions?',
  },
  'no-decision': {
    id: 'decision-close',
    title: 'Close with a decision',
    text: 'For the next meeting, could we close by stating the decision, one owner, and the next step?',
  },
  'outcome-decision': {
    id: 'decision-close',
    title: 'Close with a decision',
    text: 'For the next meeting, could we close by stating the decision, one owner, and the next step?',
  },
  'outcome-ownership': {
    id: 'decision-close',
    title: 'Close with a decision',
    text: 'For the next meeting, could we close by stating the decision, one owner, and the next step?',
  },
  'outcome-next-step': {
    id: 'decision-close',
    title: 'Close with a decision',
    text: 'For the next meeting, could we close by stating the decision, one owner, and the next step?',
  },
  'long-meetings': {
    id: 'timebox',
    title: 'Try a tighter timebox',
    text: 'Could we timebox the next session to 30 minutes and define the outcome at the start?',
  },
  'large-rooms': {
    id: 'smaller-room',
    title: 'Try a smaller decision group',
    text: 'Could we keep the decision group small and share the outcome afterward?',
  },
  'group-size': {
    id: 'smaller-room',
    title: 'Try a smaller decision group',
    text: 'Could we keep the decision group small and share the outcome afterward?',
  },
  'heavy-day': {
    id: 'recovery-buffer',
    title: 'Try one recovery buffer',
    text: 'Could we try a 15-minute buffer after one dense meeting block and review whether it helped?',
  },
  'recovery-tight-turnarounds': {
    id: 'recovery-buffer',
    title: 'Try one recovery buffer',
    text: 'Could we try a 15-minute buffer after one dense meeting block and review whether it helped?',
  },
  'recurring-cost': {
    id: 'recurring-reset',
    title: 'Reset one recurring format',
    text: 'Could we review this recurring format—its purpose, expected outcome, and who needs to attend?',
  },
  'not-needed-here': {
    id: 'decline-optional',
    title: 'Decline optional attendance',
    text: 'I may not be needed live for this one. Could I review the outcome afterward and join only if a decision needs my input?',
  },
  'series-shorten': {
    id: 'timebox',
    title: 'Propose a shorter session',
    text: 'Could we timebox the next session to 30 minutes and define the outcome at the start?',
  },
  'series-async': {
    id: 'async-update',
    title: 'Propose a written update',
    text: 'Could we try one written status update this week and use live time only for questions and decisions?',
  },
  'series-drop': {
    id: 'pause-series',
    title: 'Pause one recurring meeting',
    text: 'Could we pause this recurring meeting for one cycle and bring it back only if a live decision is needed?',
  },
};

export function buildTeamExperiment(insightId: string): TeamExperiment | null {
  return EXPERIMENTS[insightId] ?? null;
}

export function listActionKit(): TeamExperiment[] {
  return ACTION_KIT_IDS.map((id) => EXPERIMENTS[id]).filter((item): item is TeamExperiment => item != null);
}
