import { describe, expect, it } from 'vitest';
import { seedFromAddFlowState } from './addFlowState.js';

describe('seedFromAddFlowState', () => {
  it('seeds the collection id when the state carries one', () => {
    expect(seedFromAddFlowState({ collection: { id: 'c1', name: 'Blake et Mortimer' } })).toEqual(
      { collectionId: 'c1' },
    );
  });

  it('leaves the collection undefined with no state at all, the header "+" case', () => {
    expect(seedFromAddFlowState(undefined)).toEqual({ collectionId: undefined });
  });
});
