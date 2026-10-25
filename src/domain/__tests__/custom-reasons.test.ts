import { describe, expect, it } from '@jest/globals';

import { addCustomReason, mergeCustomReasons, parseCustomReasons, removeCustomReason } from '../custom-reasons';

describe('custom reasons', () => {
  it('adds a local reason with a stable custom id', () => {
    expect(addCustomReason([], 'Wrong level of detail', 'negative')).toEqual([
      { id: 'custom-wrong-level-of-detail', label: 'Wrong level of detail', sentiment: 'negative' },
    ]);
  });

  it('rejects duplicates and filters malformed saved values', () => {
    expect(() => addCustomReason([{ id: 'custom-context', label: 'Context', sentiment: 'negative' }], 'context', 'positive')).toThrow();
    expect(parseCustomReasons('[{"id":"bad","label":"Bad","sentiment":"negative"},{"id":"custom-good","label":"Good","sentiment":"positive"}]')).toEqual([
      { id: 'custom-good', label: 'Good', sentiment: 'positive' },
    ]);
  });

  it('merges without duplicates and removes by id', () => {
    const current = [{ id: 'custom-a', label: 'A', sentiment: 'positive' as const }];
    const merged = mergeCustomReasons(current, [
      { id: 'custom-a', label: 'A again', sentiment: 'negative' },
      { id: 'custom-b', label: 'B', sentiment: 'negative' },
    ]);
    expect(merged).toHaveLength(2);
    expect(removeCustomReason(merged, 'custom-a')).toEqual([
      { id: 'custom-a', label: 'A', sentiment: 'positive', active: false },
      { id: 'custom-b', label: 'B', sentiment: 'negative' },
    ]);
  });
});
