import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LedgerRow from './LedgerRow.jsx';

// A closed loan and an open one — the two shapes `pairLoanEvents` produces (loans.js), used
// directly here rather than via the pairing function: that function already has its own tests
// (loans.test.js), and this file only checks how a paired loan RENDERS.
const closedLoan = {
  name: 'Jean-Raymond',
  lentAt: '2026-08-01T10:00:00Z',
  returnedAt: '2026-08-18T10:00:00Z',
  days: 17,
  open: false,
  unresolved: false,
};

const openLoan = {
  name: 'Marie',
  lentAt: '2026-08-07T10:00:00Z',
  returnedAt: null,
  days: 6,
  open: true,
  unresolved: false,
};

describe('LedgerRow', () => {
  // Defect 1: `loan.name` was set by pairLoanEvents and never rendered, so the row answered
  // "when" but never "who" — the exact question PRODUCT.md says the product exists for.
  it('renders the borrower, not just dates', () => {
    render(<LedgerRow loan={openLoan} />);
    expect(screen.getByText('Marie')).toBeInTheDocument();
  });

  it('reads the name from the LENT event only: it never renders a RETURNED name instead', () => {
    // pairLoanEvents already discards the RETURNED event's name (loans.js `close()` uses
    // `open.name`), so a loan object never actually carries a separate returner name — this
    // pins that a differently-named field on the object couldn't leak through the row either.
    const loanWithStrayReturnerField = { ...closedLoan, returnedBy: 'Someone Else' };
    render(<LedgerRow loan={loanWithStrayReturnerField} />);
    expect(screen.getByText('Jean-Raymond')).toBeInTheDocument();
    expect(screen.queryByText('Someone Else')).toBeNull();
  });

  it('lays the loan out as two lines: borrower+duration, then the date range', () => {
    const { container } = render(<LedgerRow loan={closedLoan} />);
    const lines = container.firstChild.children;
    expect(lines).toHaveLength(2);
    expect(lines[0]).toHaveTextContent('Jean-Raymond');
    expect(lines[0]).toHaveTextContent('17 days');
    expect(lines[1]).toHaveTextContent('01 Aug 2026');
    expect(lines[1]).toHaveTextContent('18 Aug 2026');
  });

  it('states an open loan as "still out" on the date line, never a due date', () => {
    render(<LedgerRow loan={openLoan} />);
    expect(screen.getByText(/still out/i)).toBeInTheDocument();
    expect(screen.queryByText(/overdue|due/i)).toBeNull();
  });

  // The name is content and authored by whoever typed it into the Lend sheet — it sets in the
  // sans. Only the dates and the day count are numerals, and take the mono utility (`.num`,
  // DESIGN.md section 3): a name in mono is the category error the Plate Line already warns
  // about, and this component must not import it.
  it('sets the name in the sans and keeps the mono reserved for dates and the day count', () => {
    const { container } = render(<LedgerRow loan={closedLoan} />);
    const name = screen.getByText('Jean-Raymond');
    expect(name.className).not.toMatch(/\bnum\b/);
    expect(name.closest('.num')).toBeNull();

    const duration = screen.getByText('17 days');
    expect(duration.closest('.num')).not.toBeNull();

    const dateLine = container.firstChild.children[1];
    expect(dateLine.className).toMatch(/\bnum\b/);
  });

  // Defect 2: the row must be able to take inset padding when it sits inside a bordered card
  // (ItemHistory) without doing so on item detail's flush inline ledger — and the switch is a
  // dedicated `boxed` prop, not a side effect of `inverted`, which is a surface fact (paper vs.
  // the black cover) and would break the moment a boxed ledger ever appears on a cover.
  it('adds no horizontal padding by default (the flush inline ledger on item detail)', () => {
    const { container } = render(<LedgerRow loan={closedLoan} />);
    expect(container.firstChild.className).not.toMatch(/\bpx-4\b/);
  });

  it('insets with px-4 only when boxed is set (the bordered card on item history)', () => {
    const { container } = render(<LedgerRow loan={closedLoan} boxed />);
    expect(container.firstChild.className).toMatch(/\bpx-4\b/);
  });

  it('boxed and inverted are independent: boxed insets on the cover too', () => {
    const { container } = render(<LedgerRow loan={closedLoan} boxed inverted />);
    expect(container.firstChild.className).toMatch(/\bpx-4\b/);
    expect(container.firstChild.className).toMatch(/\bborder-cover-rule\b/);
  });

  it('un-boxed stays flush even when inverted (item detail hero)', () => {
    const { container } = render(<LedgerRow loan={closedLoan} inverted />);
    expect(container.firstChild.className).not.toMatch(/\bpx-4\b/);
  });

  // Round 5 critique #6: an open loan on the paper surface (item history's boxed card) carried
  // no stamp at all. Gated on `boxed` — the existing signal for "this is the paper ledger card"
  // — rather than a new prop, since item detail's own inline ledger already states the open
  // loan via DetailMarks' Overprint Stamp and must not gain a second one.
  it('stamps an open loan OUT when boxed (item history), bare — no name or days of its own', () => {
    render(<LedgerRow loan={openLoan} boxed />);
    const stamp = screen.getByLabelText('On loan');
    expect(stamp).toHaveTextContent(/^out$/i);
  });

  it('does not stamp a closed loan, even when boxed', () => {
    render(<LedgerRow loan={closedLoan} boxed />);
    expect(screen.queryByLabelText(/on loan/i)).toBeNull();
  });

  it('does not stamp an open loan when unboxed — item detail already carries the stamp itself', () => {
    render(<LedgerRow loan={openLoan} inverted />);
    expect(screen.queryByLabelText(/on loan/i)).toBeNull();
  });

  // Every colour rule below is a surface pairing: the cover set (`--cover-*`) only appears
  // together with `inverted`, and the paper set only without it — never mixed, per DESIGN.md's
  // "anything that sets a ground sets its foreground" rule.
  it('never mixes the two surfaces’ secondary tones', () => {
    const paper = render(<LedgerRow loan={closedLoan} />).container.firstChild;
    expect(paper.className).toMatch(/\btext-ink-soft\b/);
    expect(paper.className).not.toMatch(/cover-soft|cover-body|cover-rule/);

    const cover = render(<LedgerRow loan={closedLoan} inverted />).container.firstChild;
    expect(cover.className).toMatch(/\btext-cover-soft\b/);
    expect(cover.className).not.toMatch(/\btext-ink-soft\b/);
  });
});
