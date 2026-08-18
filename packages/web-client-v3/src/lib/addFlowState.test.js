import { describe, expect, it } from 'vitest';
import { NO_INPUT_MESSAGE, seedFromAddFlowState } from './addFlowState.js';

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

describe('NO_INPUT_MESSAGE', () => {
  // Finding 3 (task 19, fix round 2): AddBook.test.jsx and AddVideo.test.jsx both compare their
  // rendered notice against this SAME imported constant, which proves the conditional-render
  // wiring and the import path but cannot catch the constant's own CONTENT drifting back to the
  // exact defect that was ruled on — a message that references a photo, image or capture that
  // never happened. This asserts against a LITERAL pattern, not derived from the constant, so it
  // is not the same tautology one level down. One assertion here guards both flows, since both
  // import and render this single string.
  it('never mentions a photo, image or capture — nothing here was lost, because nothing arrived', () => {
    expect(NO_INPUT_MESSAGE).not.toMatch(/photo|image|capture/i);
  });
});
