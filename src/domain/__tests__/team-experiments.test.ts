import { describe, expect, it } from '@jest/globals';

import { buildTeamExperiment, listActionKit } from '../team-experiments';

describe('team experiments', () => {
  it('only returns reviewed templates', () => {
    expect(buildTeamExperiment('async')?.text).toContain('written status update');
    expect(buildTeamExperiment('unknown')).toBeNull();
  });

  it('contains no dynamic private meeting fields', () => {
    const forbidden = ['impact score', 'mood', 'meeting title', 'attendee', 'private note'];
    const text = buildTeamExperiment('outcome-decision')?.text.toLowerCase() ?? '';
    forbidden.forEach((value) => expect(text).not.toContain(value));
  });

  it('exposes only reviewed action-kit templates', () => {
    expect(listActionKit()).toHaveLength(4);
    expect(listActionKit().every((item) => item.text.length > 0)).toBe(true);
    expect(buildTeamExperiment('series-drop')?.text).toContain('pause');
  });
});
