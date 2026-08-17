import { describe, expect, it } from 'vitest';
import { seedFromAddFlowState } from './addFlowState.js';

describe('seedFromAddFlowState', () => {
  it('seeds the collection id from the query', () => {
    expect(seedFromAddFlowState('?collectionId=c1')).toEqual({ collectionId: 'c1' });
  });

  it('leaves the collection undefined with no query at all — the header "+" case', () => {
    expect(seedFromAddFlowState('')).toEqual({ collectionId: undefined });
  });

  // The whole point of moving off `location.state`: a cold load — a fresh tab, a deep link, a
  // PWA restart resuming this exact URL — has no router state, only the query. This is the
  // case `location.state` could never satisfy.
  it('survives a cold load — no router state, only the query string', () => {
    expect(seedFromAddFlowState(new URL('https://example.com/x?collectionId=c1').search)).toEqual(
      { collectionId: 'c1' },
    );
  });
});
