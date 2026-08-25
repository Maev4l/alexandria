import { describe, expect, it } from 'vitest';
import { replaceById } from './replaceById.js';

describe('replaceById', () => {
  it('replaces the matching record and leaves the others untouched', () => {
    const rows = [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }];
    const out = replaceById(rows, { id: 'b', title: 'B prime' });
    expect(out).toEqual([{ id: 'a', title: 'A' }, { id: 'b', title: 'B prime' }]);
    expect(out[0]).toBe(rows[0]);
  });

  // THE DIRECTION THAT MATTERS, and the one a spread passes. Optional fields are `omitempty`, so
  // a cleared one arrives ABSENT — and `{ ...row, ...fresh }` cannot delete a key, so it keeps
  // the stale value for ever. A test written on the ADDING direction cannot tell the two
  // implementations apart, which is exactly why the defect shipped green.
  it('drops a field the fresh record OMITS — the case a spread cannot handle', () => {
    const rows = [{ id: 'a', title: 'A', lentTo: 'Marie' }];
    const out = replaceById(rows, { id: 'a', title: 'A' });
    expect(out[0]).not.toHaveProperty('lentTo');
    // Stated separately from the property check: `toBeUndefined()` alone would also pass on an
    // explicit `lentTo: null`, which is a different and wrong shape for this API.
    expect('lentTo' in out[0]).toBe(false);
  });

  it('leaves the list alone when nothing matches', () => {
    const rows = [{ id: 'a' }];
    expect(replaceById(rows, { id: 'zzz' })).toEqual(rows);
  });
});
