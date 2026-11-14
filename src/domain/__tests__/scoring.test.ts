import { describe, expect, it, test } from '@jest/globals';

import { calculateImpactScore, getDurationMultiplier, getImpactLabel, getPulseClassification, getPulseTone, getReasonModifier } from '../scoring';

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
