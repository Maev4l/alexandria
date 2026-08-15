import { describe, expect, it } from 'vitest';
import { daysBetween, pairLoanEvents } from './loans.js';

const NOW = new Date('2026-08-13T12:00:00Z');

describe('daysBetween', () => {
  it('counts whole days', () => {
    expect(daysBetween('2026-08-01T00:00:00Z', '2026-08-08T00:00:00Z')).toBe(7);
  });

  it('floors a partial day rather than rounding it up', () => {
    expect(daysBetween('2026-08-01T00:00:00Z', '2026-08-01T23:00:00Z')).toBe(0);
  });
});

describe('pairLoanEvents', () => {
  it('pairs a LENT with the RETURNED that follows it', () => {
    const loans = pairLoanEvents(
      [
        { date: '2026-03-19T10:00:00Z', type: 'RETURNED', event: 'Paul' },
        { date: '2026-03-02T10:00:00Z', type: 'LENT', event: 'Paul' },
      ],
      NOW,
    );
    expect(loans).toHaveLength(1);
    expect(loans[0]).toMatchObject({ name: 'Paul', days: 17, open: false });
  });

  it('leaves the most recent LENT open and measures it against now', () => {
    const loans = pairLoanEvents([{ date: '2026-08-07T12:00:00Z', type: 'LENT', event: 'Marie' }], NOW);
    expect(loans[0]).toMatchObject({ name: 'Marie', open: true, days: 6, returnedAt: null });
  });

  it('returns loans newest first, matching the ledger reading order', () => {
    const loans = pairLoanEvents(
      [
        { date: '2026-08-07T12:00:00Z', type: 'LENT', event: 'Marie' },
        { date: '2026-03-19T10:00:00Z', type: 'RETURNED', event: 'Paul' },
        { date: '2026-03-02T10:00:00Z', type: 'LENT', event: 'Paul' },
      ],
      NOW,
    );
    expect(loans.map((l) => l.name)).toEqual(['Marie', 'Paul']);
  });

  it('marks a LENT superseded by another LENT as unresolved, not as returned', () => {
    // Real histories contain this. Inventing a return date would be a lie; calling both open
    // would be another. It is simply a loan with no recorded return.
    const loans = pairLoanEvents(
      [
        { date: '2026-08-07T12:00:00Z', type: 'LENT', event: 'Marie' },
        { date: '2026-03-11T10:00:00Z', type: 'LENT', event: 'Léa' },
      ],
      NOW,
    );
    expect(loans).toHaveLength(2);
    expect(loans[0]).toMatchObject({ name: 'Marie', open: true });
    expect(loans[1]).toMatchObject({ name: 'Léa', open: false, unresolved: true, returnedAt: null });
  });

  it('drops a RETURNED with no matching LENT rather than inventing a loan', () => {
    expect(pairLoanEvents([{ date: '2026-01-01T00:00:00Z', type: 'RETURNED', event: 'X' }], NOW)).toEqual([]);
  });

  it('ignores an event with no timestamp, which the API types as nullable', () => {
    expect(pairLoanEvents([{ type: 'LENT', event: 'X' }], NOW)).toEqual([]);
  });

  it('returns nothing for an item that has never been lent', () => {
    expect(pairLoanEvents([], NOW)).toEqual([]);
  });
});
