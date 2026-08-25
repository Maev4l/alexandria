import { renderHook, waitFor, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStream } from './StreamContext.jsx';
import { handleMockRequest, resetMockState } from '../../tools/mock-api.js';

// THE COVERAGE GAP THIS CLOSES IS ON THE IMPLEMENTATION THAT WAS RIGHT.
//
// `patchItem` has always REPLACED a re-read record rather than spreading over it, so the browse
// stream never had the search surface's defect: optional fields are `omitempty`, a returned item
// comes back with `lentTo` ABSENT, and `{ ...row, ...fresh }` cannot delete a key. But
// `Mark returned` was exercised only on item detail and on the search surface, so this one's
// correctness was by construction and nothing asserted it.
//
// That is the shape worth naming: after fixing one of two siblings, the BROKEN one gains a probe
// because it broke, and the correct one keeps having none — so a later refactor can silently make
// it the broken one. Correct-by-construction is not covered.
//
// TESTED AT THE HOOK, not through the screen, and that is a correction rather than a shortcut. An
// integration probe was written first and could not be made to discriminate: with the harness
// forwarding real methods, the mock genuinely clears `lentTo`, so the stamp left the row even with
// `patchItem` replaced by a no-op. It was measuring the fixture. A test that passes against a
// no-op of the thing it names is worse than no test, so it was removed rather than kept green.
const withFetch = () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, init) => {
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(init.body) : undefined;
      const result = handleMockRequest(method, String(url), body) ?? {
        status: 404,
        body: { message: 'Not found' },
      };
      return {
        ok: result.status < 400,
        status: result.status,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => result.body,
      };
    }),
  );
};

const findItem = (runs, id) => {
  for (const run of runs) {
    for (const entry of run.entries ?? []) {
      if (entry.id === id) return entry;
      const member = (entry.items ?? []).find((m) => m.id === id);
      if (member) return member;
    }
  }
  return undefined;
};

beforeEach(() => {
  resetMockState();
  withFetch();
});

afterEach(() => vi.unstubAllGlobals());

describe('useStream.patchItem', () => {
  it('drops a field the re-read OMITS, rather than keeping the stale value', async () => {
    const { result } = renderHook(() => useStream('lib-fiction'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const before = findItem(result.current.runs, 'item-lent');
    expect(before?.lentTo).toBe('Marie');

    // The write the reader makes, against the same mock the screen uses: a RETURNED event, after
    // which `GET items/{id}` omits `lentTo` entirely.
    await fetch('/api/v1/libraries/lib-fiction/items/item-lent/events', {
      method: 'POST',
      body: JSON.stringify({ type: 'RETURNED', event: 'Marie' }),
    });

    await act(async () => {
      await result.current.patchItem('item-lent');
    });

    // ABSENCE is the assertion. A probe on the LEND direction — which ADDS a key — passes against
    // a spread merge, which is exactly how the sibling surface shipped this defect green.
    const after = findItem(result.current.runs, 'item-lent');
    expect(after).toBeDefined();
    expect(after).not.toHaveProperty('lentTo');
    // Stated separately: `toBeUndefined()` would also pass on an explicit `lentTo: null`, a
    // different and wrong shape for this API.
    expect('lentTo' in after).toBe(false);
  });

  it('leaves every other entry untouched', async () => {
    const { result } = renderHook(() => useStream('lib-fiction'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const other = findItem(result.current.runs, 'item-1984');

    await act(async () => {
      await result.current.patchItem('item-lent');
    });

    expect(findItem(result.current.runs, 'item-1984')).toBe(other);
  });
});
