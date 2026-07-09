import { describe, expect, it, test } from '@jest/globals';

import { calculateImpactScore, getDurationMultiplier, getImpactLabel, getPulseClassification } from '../scoring';

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
});

describe('pulse labels', () => {
  test.each([
    [20, 'Energizing Week'],
    [5, 'Healthy Meeting Week'],
    [4.9, 'Neutral Week'],
    [-4.9, 'Neutral Week'],
    [-5, 'Draining Week'],
    [-19.9, 'Draining Week'],
    [-20, 'Meeting Damage Week'],
  ])('classifies %s as %s', (score, label) => {
    expect(getPulseClassification(score as number)).toBe(label);
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
