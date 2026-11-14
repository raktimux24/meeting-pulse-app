import { describe, expect, it, test } from '@jest/globals';

import {
  calculateImpactScore,
  getDurationMultiplier,
  getImpactLabel,
  getOutcomeModifier,
  getPulseClassification,
  getPulseTone,
  getReasonModifier,
  getScoreBreakdown,
} from '../scoring';

describe('meeting impact scoring', () => {
  test.each([
    [1, 1],
    [15, 1],
    [16, 1.2],
    [30, 1.2],
    [31, 1.5],
    [60, 1.5],
    [61, 2],
    [90, 2],
    [91, 2.5],
  ])('uses the correct duration multiplier at %i minutes', (minutes, expected) => {
    expect(getDurationMultiplier(minutes)).toBe(expected);
  });

  it('combines mood, duration, and positive reasons to one decimal place', () => {
    expect(calculateImpactScore('clear', 30, ['clear-outcome', 'good-facilitation'])).toBe(5.4);
  });

  it('combines mood, duration, and negative reasons', () => {
    expect(calculateImpactScore('drained', 60, ['no-decision', 'too-many-people'])).toBe(-6);
  });

  it('lets reasons affect a neutral meeting', () => {
    expect(calculateImpactScore('neutral', 30, ['fast-decision'])).toBe(2);
  });

  it('caps reasons so they cannot overturn the mood', () => {
    expect(getReasonModifier(['clear-outcome', 'fast-decision', 'strong-alignment'])).toBe(3);
    expect(getReasonModifier(['no-decision', 'unclear-ownership', 'could-have-been-async'])).toBe(-3);
    expect(calculateImpactScore('frustrated', 90, ['clear-outcome', 'fast-decision', 'strong-alignment'])).toBe(-3);
  });
});

describe('pulse labels', () => {
  test.each([
    [20, 'Energizing Week'],
    [5, 'Healthy Meeting Week'],
    [4.9, 'Neutral Week'],
    [-4.9, 'Neutral Week'],
    [-5, 'Draining Week'],
    [-19.9, 'Draining Week'],
    [-20, 'Heavy meeting week'],
  ])('classifies %s as %s', (score, label) => {
    expect(getPulseClassification(score as number)).toBe(label);
  });

  test.each([
    [5, 'positive'],
    [4.9, 'neutral'],
    [-0.6, 'neutral'],
    [-5, 'negative'],
  ])('gives %s the same tone as its week label: %s', (score, tone) => {
    expect(getPulseTone(score as number)).toBe(tone);
  });

  test.each([
    [5, 'High return'],
    [0.1, 'Energy returned'],
    [0, 'Neutral impact'],
    [-0.1, 'Some friction'],
    [-5, 'High cost'],
  ])('labels meeting score %s as %s', (score, label) => {
    expect(getImpactLabel(score as number)).toBe(label);
  });
});

describe('outcome weighting', () => {
  it('adds nothing when no outcome questions were answered', () => {
    expect(getOutcomeModifier(undefined, [])).toBe(0);
    expect(getOutcomeModifier({}, [])).toBe(0);
    expect(calculateImpactScore('clear', 30, [], {})).toBe(calculateImpactScore('clear', 30, []));
  });

  it('scores each outcome check: yes +1, no -1, not needed 0', () => {
    expect(getOutcomeModifier({ decisionStatus: 'yes', ownershipStatus: 'yes', nextStepStatus: 'not-needed' }, [])).toBe(2);
    expect(getOutcomeModifier({ decisionStatus: 'no', ownershipStatus: 'no', nextStepStatus: 'no' }, [])).toBe(-3);
  });

  it('counts whether the intended outcome was met only when one was written', () => {
    expect(getOutcomeModifier({ intendedOutcome: 'Agree the launch date', intendedOutcomeMet: 'yes' }, [])).toBe(1.5);
    expect(getOutcomeModifier({ intendedOutcome: 'Agree the launch date', intendedOutcomeMet: 'partly' }, [])).toBe(0.5);
    expect(getOutcomeModifier({ intendedOutcome: 'Agree the launch date', intendedOutcomeMet: 'no' }, [])).toBe(-1.5);
    expect(getOutcomeModifier({ intendedOutcome: '  ', intendedOutcomeMet: 'yes' }, [])).toBe(0);
    expect(getOutcomeModifier({ intendedOutcome: null, intendedOutcomeMet: 'no' }, [])).toBe(0);
  });

  it('caps outcomes at +/-3 so mood still leads', () => {
    const allYes = { decisionStatus: 'yes', ownershipStatus: 'yes', nextStepStatus: 'yes', intendedOutcome: 'x', intendedOutcomeMet: 'yes' } as const;
    const allNo = { decisionStatus: 'no', ownershipStatus: 'no', nextStepStatus: 'no', intendedOutcome: 'x', intendedOutcomeMet: 'no' } as const;
    expect(getOutcomeModifier(allYes, [])).toBe(3);
    expect(getOutcomeModifier(allNo, [])).toBe(-3);
  });

  it('does not penalise twice when a reason already says the same thing', () => {
    expect(getOutcomeModifier({ decisionStatus: 'no' }, ['no-decision'])).toBe(0);
    expect(getOutcomeModifier({ ownershipStatus: 'no' }, ['unclear-ownership'])).toBe(0);
    expect(getOutcomeModifier({ nextStepStatus: 'no' }, ['no-decision'])).toBe(-1);
  });

  it('adds outcomes on top of mood, duration and reasons', () => {
    // clear (+2) x 30 min (1.2) + clear outcome (+2) + decision yes and met yes (+2.5) = 6.9
    expect(calculateImpactScore('clear', 30, ['clear-outcome'], { decisionStatus: 'yes', intendedOutcome: 'Pick a vendor', intendedOutcomeMet: 'yes' })).toBe(6.9);
    expect(getScoreBreakdown('clear', 30, ['clear-outcome'], { decisionStatus: 'yes' })).toEqual({
      moodBase: 2,
      multiplier: 1.2,
      reasons: 2,
      outcomes: 1,
      total: 5.4,
    });
  });
});
